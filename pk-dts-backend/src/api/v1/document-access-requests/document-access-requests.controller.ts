import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { DocumentAccessRequestsService } from "./document-access-requests.service";
import { AccessRequestCatalogQueryDto } from "./dto/access-request-catalog-query.dto";
import { CreateDocumentAccessRequestDto } from "./dto/create-document-access-request.dto";
import { ReviewDocumentAccessRequestDto } from "./dto/review-document-access-request.dto";

@ApiTags("Document Access Requests")
@Controller({ path: "document-access-requests", version: "1" })
export class DocumentAccessRequestsController {
  constructor(private readonly service: DocumentAccessRequestsService) {}

  @Get("catalog")
  @RequirePermissions("document-access-requests.catalog")
  @ApiOperation({ summary: "Search approved document metadata available for access requests" })
  catalog(
    @Query() query: AccessRequestCatalogQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.catalog(query, user!);
  }

  @Get("locations")
  @RequirePermissions("document-access-requests.catalog")
  @ApiOperation({ summary: "List searchable hardcopy locations for the access catalog" })
  locations() {
    return this.service.locations();
  }

  @Post()
  @RequirePermissions("document-access-requests.create")
  @ApiOperation({ summary: "Request access to a document for the current user" })
  create(
    @Body() dto: CreateDocumentAccessRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.create(dto, user!);
  }

  @Get("mine")
  @RequirePermissions("document-access-requests.view-own")
  mine(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.mine(query, user!);
  }

  @Patch(":id/cancel")
  @RequirePermissions("document-access-requests.cancel-own")
  @ApiOperation({ summary: "Cancel the current user's pending access request" })
  cancel(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.cancel(id, user!);
  }

  @Get("pending")
  @RequirePermissions("document-access-requests.review")
  pending(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.pending(query, user!);
  }

  @Patch(":id/review")
  @RequirePermissions(
    "document-access-requests.approve",
    "document-access-requests.reject",
  )
  review(
    @Param("id") id: string,
    @Body() dto: ReviewDocumentAccessRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.review(id, dto, user!);
  }

  @Patch(":id/grant")
  @RequirePermissions("document-access-requests.grant", "document-access-requests.approve")
  grant(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.grant(id, user!);
  }

  @Patch(":id/revoke")
  @RequirePermissions("document-access-requests.revoke", "document-access-requests.approve")
  revoke(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.revoke(id, user!);
  }

  @Patch(":id/expire")
  @RequirePermissions("document-access-requests.expire", "document-access-requests.approve")
  expire(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.expire(id, user!);
  }
}
