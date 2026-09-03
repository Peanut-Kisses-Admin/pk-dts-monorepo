import { Module } from "@nestjs/common";
import { DocumentAccessRequestsController } from "./document-access-requests.controller";
import { DocumentAccessRequestsService } from "./document-access-requests.service";

@Module({
  controllers: [DocumentAccessRequestsController],
  providers: [DocumentAccessRequestsService],
})
export class DocumentAccessRequestsModule {}
