import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { DocumentStatus } from "@prisma/client";
import AdmZip = require("adm-zip");
import * as XLSX from "xlsx";
import { ElectronicDocumentStampService } from "./electronic-document-stamp.service";

describe("ElectronicDocumentStampService", () => {
  const service = new ElectronicDocumentStampService();
  const revision = {
    revision_number: "001",
    effective_date: new Date("2026-08-29T00:00:00.000Z"),
    new_effective_date: null,
    is_current: true,
    is_historical: false,
    approved_at: new Date("2026-08-29T00:00:00.000Z"),
  } as any;

  it("derives the stamp from status and revision metadata", () => {
    expect(
      service.buildStamp(DocumentStatus.Approved, revision, "DOC-001"),
    ).toEqual({
      label: "CONTROLLED DOCUMENT",
      color: "0000FF",
      text: "CONTROLLED DOCUMENT | Document No.: DOC-001 | Rev. 001 | Effective Date: 2026-08-29",
    });

    expect(
      service.buildStamp(DocumentStatus.Rejected, revision, "DOC-001").color,
    ).toBe("FF0000");
    expect(
      service.buildStamp(
        DocumentStatus.Approved,
        { ...revision, is_current: false, is_historical: true },
        "DOC-001",
      ).label,
    ).toBe("SUPERSEDED DOCUMENT");
    expect(
      service.buildStamp(DocumentStatus.Draft, revision, "DOC-001").label,
    ).toBe("DRAFT DOCUMENT");
  });

  it("creates an uncontrolled copy stamp from revision metadata", () => {
    expect(service.buildUncontrolledCopyStamp(revision, "DOC-001")).toEqual({
      label: "UNCONTROLLED COPY",
      color: "FF0000",
      text: "UNCONTROLLED COPY | Document No.: DOC-001 | Rev. 001 | Verify the current revision before use.",
    });
  });

  it("adds a DOCX footer without changing the source package", () => {
    const source = new AdmZip();
    source.addFile(
      "word/document.xml",
      Buffer.from(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p/><w:sectPr></w:sectPr></w:body></w:document>',
      ),
    );
    source.addFile(
      "word/_rels/document.xml.rels",
      Buffer.from(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
      ),
    );
    source.addFile(
      "[Content_Types].xml",
      Buffer.from(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
      ),
    );
    const original = source.toBuffer();
    const stamped = service.stampOfficeFile(
      original,
      "controlled.docx",
      service.buildStamp(DocumentStatus.Approved, revision, "DOC-001"),
    );
    const output = new AdmZip(stamped.buffer);

    expect(output.getEntry("word/electronic-stamp-footer.xml")).toBeTruthy();
    expect(output.getEntry("word/document.xml")?.getData().toString()).toContain(
      "rIdElectronicStamp",
    );
    expect(output.getEntry("word/electronic-stamp-footer.xml")?.getData().toString()).toContain(
      "CONTROLLED DOCUMENT",
    );
    expect(new AdmZip(original).getEntry("word/electronic-stamp-footer.xml")).toBeNull();
  });

  it("adds the footer to every Excel worksheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["One"]]), "One");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Two"]]), "Two");
    const source = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const stamped = service.stampOfficeFile(
      source,
      "controlled.xlsx",
      service.buildStamp(DocumentStatus.Draft, revision, "DOC-001"),
    );
    const output = new AdmZip(stamped.buffer);
    const worksheets = output
      .getEntries()
      .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName));

    expect(worksheets).toHaveLength(2);
    for (const worksheet of worksheets) {
      const worksheetXml = worksheet.getData().toString();
      expect(worksheetXml).toContain("DRAFT DOCUMENT");
      expect(worksheetXml.indexOf("<headerFooter")).toBeLessThan(
        worksheetXml.indexOf("<ignoredErrors"),
      );
    }

    expect(stamped.fileName).toBe("controlled-stamped.xlsx");
    expect(stamped.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(XLSX.read(stamped.buffer, { type: "buffer" }).SheetNames).toEqual([
      "One",
      "Two",
    ]);
  });

  it("converts legacy XLS files to valid XLSX stamped downloads", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Legacy Excel"]]),
      "Sheet1",
    );
    const source = XLSX.write(workbook, { type: "buffer", bookType: "xls" }) as Buffer;
    const stamped = service.stampOfficeFile(
      source,
      "legacy.xls",
      service.buildUncontrolledCopyStamp(revision, "DOC-001"),
    );

    expect(stamped.fileName).toBe("legacy-stamped.xlsx");
    expect(stamped.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(XLSX.read(stamped.buffer, { type: "buffer" }).SheetNames).toEqual([
      "Sheet1",
    ]);
  });
  it("replaces managed DOCX stamps on repeated generation and keeps source content", async () => {
    const zip = new AdmZip();
    zip.addFile("word/document.xml", Buffer.from('<w:document><w:body><w:p><w:r><w:t>Original content</w:t></w:r></w:p><w:sectPr></w:sectPr></w:body></w:document>'));
    zip.addFile("word/_rels/document.xml.rels", Buffer.from('<Relationships></Relationships>'));
    zip.addFile("[Content_Types].xml", Buffer.from('<Types></Types>'));
    const original = zip.toBuffer();
    const first = await service.stampFile(original, 'source.docx', service.buildStamp(DocumentStatus.Completed, revision, 'DOC-001'));
    const second = await service.stampFile(first.buffer, first.fileName, service.buildUncontrolledCopyStamp(revision, 'DOC-001'));
    const output = new AdmZip(second.buffer);
    const footer = output.readAsText('word/electronic-stamp-footer.xml');
    expect(footer.match(/DTS_ELECTRONIC_STAMP/g)).toHaveLength(1);
    expect(footer).toContain('UNCONTROLLED COPY');
    expect(footer).toContain('FF0000');
    expect(output.readAsText('word/document.xml')).toContain('Original content');
    expect(new AdmZip(original).getEntry('word/electronic-stamp-footer.xml')).toBeNull();
    expect(second.fileName).toBe('source-stamped.docx');
  });

  it("stamps all Excel footer variants without duplicate stamps", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Source cell']]), 'One');
    const source = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const stamp = service.buildUncontrolledCopyStamp(revision, 'DOC-001');
    const first = await service.stampFile(source, 'source.xlsx', stamp);
    const second = await service.stampFile(first.buffer, 'source.xlsx', stamp);
    const xml = new AdmZip(second.buffer).readAsText('xl/worksheets/sheet1.xml');
    for (const tag of ['oddFooter', 'evenFooter', 'firstFooter']) {
      expect(xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1].match(/UNCONTROLLED COPY/g)).toHaveLength(1);
    }
    expect(new AdmZip(second.buffer).readAsText('customXml/dts-stamp.xml')).toContain('FF0000');
  });

  it("adds a PDF footer margin, preserves the source, and prevents restamping", async () => {
    const source = await PDFDocument.create(); source.addPage([600, 800]);
    const bytes = Buffer.from(await source.save());
    const stamp = service.buildStamp(DocumentStatus.Completed, revision, 'DOC-001');
    const result = await service.stampFile(bytes, 'source.pdf', stamp);
    const pdf = await PDFDocument.load(result.buffer);
    expect(pdf.getPages()[0].getCropBox().height).toBe(832);
    expect((pdf.catalog.get(PDFName.of('DTSStamp')) as PDFString).decodeText()).toBe(stamp.text);
    expect((await PDFDocument.load(bytes)).getPages()[0].getHeight()).toBe(800);
    expect((await service.stampFile(result.buffer, 'source.pdf', stamp)).buffer).toEqual(result.buffer);
    await expect(service.stampFile(result.buffer, 'source.pdf', service.buildUncontrolledCopyStamp(revision))).rejects.toThrow('preserved original');
  });

});
