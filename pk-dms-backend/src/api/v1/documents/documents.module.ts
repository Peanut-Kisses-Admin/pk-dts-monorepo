import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { PublicDocumentsController } from "./public-documents.controller";
import { ElectronicDocumentStampService } from "./electronic-document-stamp.service";

@Module({
  controllers: [DocumentsController, PublicDocumentsController],
  providers: [DocumentsService, ElectronicDocumentStampService],
})
export class DocumentsModule {}
