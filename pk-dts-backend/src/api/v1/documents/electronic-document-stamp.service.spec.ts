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
});
