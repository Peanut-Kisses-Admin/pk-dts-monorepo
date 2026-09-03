import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { PublicDocumentQueryDto } from "./dto/public-document-query.dto";
import { DocumentsService } from "./documents.service";

@ApiTags("Document Search Portal")
@Controller({ path: "public/documents", version: "1" })
export class PublicDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: "Search approved documents from the protected landing-page portal" })
  @ApiOkResponse({ description: "Search portal documents retrieved successfully." })
  findAll(@Query() query: PublicDocumentQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.documentsService.findPublicDocuments(query, user!);
  }

  @Get(":id")
  @ApiOperation({ summary: "View approved search-portal document details" })
  @ApiOkResponse({ description: "Public document retrieved successfully." })
  @ApiNotFoundResponse({ description: "Public document was not found." })
  findOne(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.documentsService.findPublicDocument(id, user!);
  }
}
