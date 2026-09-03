import { Injectable } from "@nestjs/common";
import { DocumentRevision, DocumentStatus } from "@prisma/client";
import AdmZip = require("adm-zip");
import { posix } from "path";
import * as XLSX from "xlsx";

export type ElectronicDocumentStamp = {
  label:
    | "CONTROLLED DOCUMENT"
    | "UNCONTROLLED COPY"
    | "SUPERSEDED DOCUMENT"
    | "OBSOLETE DOCUMENT"
    | "DRAFT DOCUMENT";
  color: string;
  text: string;
};

type StampRevision = Pick<
  DocumentRevision,
  | "revision_number"
  | "effective_date"
  | "new_effective_date"
  | "is_current"
  | "is_historical"
  | "approved_at"
>;

@Injectable()
export class ElectronicDocumentStampService {
  buildStamp(
    status: DocumentStatus,
    revision: StampRevision,
    documentNumber?: string | null,
  ): ElectronicDocumentStamp {
    const number = documentNumber?.trim() || "N/A";
    const revisionNumber = revision.revision_number?.trim() || "N/A";
    const effectiveDate = this.formatDate(
      revision.effective_date ?? revision.new_effective_date,
    );
    const metadata = `Document No.: ${number} | Rev. ${revisionNumber}`;

    if (revision.is_historical || (!revision.is_current && revision.approved_at)) {
      return this.createStamp(
        "SUPERSEDED DOCUMENT",
        "666666",
        `${metadata} | NOT FOR CURRENT USE.`,
      );
    }

    if (status === DocumentStatus.Cancelled || status === DocumentStatus.Disposed) {
      return this.createStamp(
        "OBSOLETE DOCUMENT",
        "666666",
        `${metadata} | NOT FOR USE.`,
      );
    }

    if (status === DocumentStatus.Rejected) {
      return this.createStamp(
        "UNCONTROLLED COPY",
        "FF0000",
        `${metadata} | Verify the current revision before use.`,
      );
    }

    if (status === DocumentStatus.Approved || status === DocumentStatus.Completed) {
      return this.createStamp(
        "CONTROLLED DOCUMENT",
        "0000FF",
        `${metadata} | Effective Date: ${effectiveDate}`,
      );
    }

    return this.createStamp(
      "DRAFT DOCUMENT",
      "C65D00",
      `${metadata} | NOT APPROVED FOR USE.`,
    );
  }

  buildUncontrolledCopyStamp(
    revision: Pick<DocumentRevision, "revision_number">,
    documentNumber?: string | null,
  ): ElectronicDocumentStamp {
    const number = documentNumber?.trim() || "N/A";
    const revisionNumber = revision.revision_number?.trim() || "N/A";
    const metadata = `Document No.: ${number} | Rev. ${revisionNumber}`;

    return this.createStamp(
      "UNCONTROLLED COPY",
      "FF0000",
      `${metadata} | Verify the current revision before use.`,
    );
  }

  stampOfficeFile(
    source: Buffer,
    fileName: string,
    stamp: ElectronicDocumentStamp,
  ) {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith(".docx")) {
      return {
        buffer: this.stampDocx(source, stamp),
        fileName: this.stampedFileName(fileName),
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }

    if (lowerName.endsWith(".xlsx")) {
      return {
        buffer: this.stampXlsx(source, stamp),
        fileName: this.stampedFileName(fileName),
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    if (lowerName.endsWith(".xls")) {
      const workbook = XLSX.read(source, { type: "buffer" });
      const converted = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      }) as Buffer;
      return {
        buffer: this.stampXlsx(converted, stamp),
        fileName: this.stampedFileName(fileName),
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    throw new Error("Electronic stamps are supported for DOCX and Excel files only.");
  }

  private createStamp(
    label: ElectronicDocumentStamp["label"],
    color: string,
    suffix: string,
  ): ElectronicDocumentStamp {
    return { label, color, text: `${label} | ${suffix}` };
  }

  private formatDate(value: Date | null | undefined) {
    return value ? value.toISOString().slice(0, 10) : "N/A";
  }

  private stampedFileName(fileName: string) {
    const extension = fileName.match(/\.[^.]+$/)?.[0] || "";
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    return `${baseName}-stamped${extension.toLowerCase() === ".xls" ? ".xlsx" : extension}`;
  }

  private stampDocx(source: Buffer, stamp: ElectronicDocumentStamp) {
    const archive = new AdmZip(source);
    const documentEntry = archive.getEntry("word/document.xml");
    const relationshipsEntry = archive.getEntry("word/_rels/document.xml.rels");
    const contentTypesEntry = archive.getEntry("[Content_Types].xml");

    if (!documentEntry || !relationshipsEntry || !contentTypesEntry) {
      throw new Error("The DOCX package is missing required document parts.");
    }

    let documentXml = documentEntry.getData().toString("utf8");
    const relationshipsXml = relationshipsEntry.getData().toString("utf8");
    let contentTypesXml = contentTypesEntry.getData().toString("utf8");
    const footerXml = this.docxStampParagraph(stamp);
    const footerTargets = new Set<string>();

    for (const relationship of this.xmlTags(relationshipsXml, "Relationship")) {
      const type = this.xmlAttribute(relationship, "Type");
      if (!type?.endsWith("/footer")) continue;
      const target = this.xmlAttribute(relationship, "Target");
      if (target) footerTargets.add(this.resolveWordPart(target));
    }

    for (const target of footerTargets) {
      const footerEntry = archive.getEntry(target);
      if (!footerEntry) continue;
      const originalFooter = footerEntry.getData().toString("utf8");
      if (!originalFooter.includes("</w:ftr>")) continue;
      archive.updateFile(
        target,
        Buffer.from(originalFooter.replace("</w:ftr>", `${footerXml}</w:ftr>`), "utf8"),
      );
    }

    const existingDefaultFooterIds = new Set<string>();
    for (const footerReference of this.xmlTags(documentXml, "w:footerReference")) {
      if (this.xmlAttribute(footerReference, "w:type") === "default") {
        const id = this.xmlAttribute(footerReference, "r:id");
        if (id) existingDefaultFooterIds.add(id);
      }
    }

    const requiresGeneratedFooter = Array.from(
      documentXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g),
    ).some((match) => !this.hasDefaultFooterReference(match[0]));

    if (requiresGeneratedFooter || existingDefaultFooterIds.size === 0) {
      const relationshipId = this.nextRelationshipId(relationshipsXml);
      const footerPart = "word/electronic-stamp-footer.xml";
      const relationship = `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="electronic-stamp-footer.xml"/>`;
      const generatedFooter = this.docxFooterDocument(stamp);

      archive.addFile(footerPart, Buffer.from(generatedFooter, "utf8"));
      archive.updateFile(
        "word/_rels/document.xml.rels",
        Buffer.from(
          relationshipsXml.replace("</Relationships>", `${relationship}</Relationships>`),
          "utf8",
        ),
      );

      if (!contentTypesXml.includes(`PartName="/${footerPart}"`)) {
        const override = `<Override PartName="/${footerPart}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`;
        contentTypesXml = contentTypesXml.replace(
          "</Types>",
          `${override}</Types>`,
        );
        archive.updateFile(
          "[Content_Types].xml",
          Buffer.from(contentTypesXml, "utf8"),
        );
      }

      documentXml = documentXml.replace(
        /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g,
        (section) =>
          this.hasDefaultFooterReference(section)
            ? section
            : section.replace(
                "</w:sectPr>",
                `<w:footerReference w:type="default" r:id="${relationshipId}"/></w:sectPr>`,
              ),
      );

      if (!documentXml.includes(`r:id="${relationshipId}"`)) {
        documentXml = documentXml.replace(
          "</w:body>",
          `<w:sectPr><w:footerReference w:type="default" r:id="${relationshipId}"/></w:sectPr></w:body>`,
        );
      }
    }

    archive.updateFile("word/document.xml", Buffer.from(documentXml, "utf8"));
    return archive.toBuffer();
  }

  private stampXlsx(source: Buffer, stamp: ElectronicDocumentStamp) {
    const archive = new AdmZip(source);
    const footer = this.xmlEscape(`&C&K${stamp.color}${stamp.text}`);
    const worksheetEntries = archive
      .getEntries()
      .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName));

    if (!worksheetEntries.length) {
      throw new Error("The Excel package has no worksheets.");
    }

    for (const worksheetEntry of worksheetEntries) {
      let worksheetXml = worksheetEntry.getData().toString("utf8");
      const headerFooterMatch = worksheetXml.match(
        /<headerFooter\b[^>]*>[\s\S]*?<\/headerFooter>/i,
      );

      if (headerFooterMatch) {
        const headerFooter = headerFooterMatch[0];
        const updatedHeaderFooter = /<oddFooter\b[^>]*>[\s\S]*?<\/oddFooter>/i.test(
          headerFooter,
        )
          ? headerFooter.replace(
              /<oddFooter\b[^>]*>[\s\S]*?<\/oddFooter>/i,
              `<oddFooter>${footer}</oddFooter>`,
            )
          : headerFooter.replace(
              "</headerFooter>",
              `<oddFooter>${footer}</oddFooter></headerFooter>`,
            );
        worksheetXml = this.insertWorksheetHeaderFooter(
          worksheetXml.replace(headerFooter, ""),
          updatedHeaderFooter,
        );
      } else if (/<headerFooter\b[^>]*\/>/i.test(worksheetXml)) {
        worksheetXml = this.insertWorksheetHeaderFooter(
          worksheetXml.replace(/<headerFooter\b[^>]*\/>/i, ""),
          `<headerFooter><oddFooter>${footer}</oddFooter></headerFooter>`,
        );
      } else {
        worksheetXml = this.insertWorksheetHeaderFooter(
          worksheetXml,
          `<headerFooter><oddFooter>${footer}</oddFooter></headerFooter>`,
        );
      }

      archive.updateFile(worksheetEntry.entryName, Buffer.from(worksheetXml, "utf8"));
    }

    return archive.toBuffer();
  }

  private insertWorksheetHeaderFooter(worksheetXml: string, headerFooter: string) {
    const followingElements = [
      "rowBreaks",
      "colBreaks",
      "customProperties",
      "cellWatches",
      "ignoredErrors",
      "smartTags",
      "drawing",
      "picture",
      "oleObjects",
      "controls",
      "webPublishItems",
      "tableParts",
      "extLst",
    ];

    for (const elementName of followingElements) {
      const elementStart = worksheetXml.search(
        new RegExp(`<${elementName}(?:\\s|>)`, "i"),
      );
      if (elementStart >= 0) {
        return `${worksheetXml.slice(0, elementStart)}${headerFooter}${worksheetXml.slice(elementStart)}`;
      }
    }

    const worksheetEnd = worksheetXml.lastIndexOf("</worksheet>");
    if (worksheetEnd < 0) {
      throw new Error("The Excel worksheet package is missing its closing worksheet element.");
    }

    return `${worksheetXml.slice(0, worksheetEnd)}${headerFooter}${worksheetXml.slice(worksheetEnd)}`;
  }

  private docxStampParagraph(stamp: ElectronicDocumentStamp) {
    return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${stamp.color}"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${this.xmlEscape(stamp.text)}</w:t></w:r></w:p>`;
  }

  private docxFooterDocument(stamp: ElectronicDocumentStamp) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${this.docxStampParagraph(stamp)}</w:ftr>`;
  }

  private xmlTags(xml: string, tagName: string) {
    return Array.from(xml.matchAll(new RegExp(`<${tagName}\\b[^>]*\\/?>(?:</${tagName}>)?`, "g"))).map(
      (match) => match[0],
    );
  }

  private xmlAttribute(tag: string, attribute: string) {
    return tag.match(new RegExp(`${attribute.replace(":", "\\:")}=["']([^"']+)["']`))?.[1];
  }

  private resolveWordPart(target: string) {
    return posix.normalize(posix.join("word", target.replace(/\\/g, "/"))).replace(/^\.\//, "");
  }

  private hasDefaultFooterReference(section: string) {
    return /<w:footerReference\b[^>]*w:type=["']default["'][^>]*\/?/i.test(section);
  }

  private nextRelationshipId(relationshipsXml: string) {
    const ids = Array.from(relationshipsXml.matchAll(/Id=["']rId(\d+)["']/g)).map((match) => Number(match[1]));
    return `rIdElectronicStamp${ids.length ? Math.max(...ids) + 1 : 1}`;
  }

  private xmlEscape(value: string) {
    return value.replace(/[&<>"']/g, (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
        character
      ] || character,
    );
  }
}
