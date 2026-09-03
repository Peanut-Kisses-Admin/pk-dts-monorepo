import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { CreateSoftcopyCategoryDto } from "./dto/create-softcopy-category.dto";
import { UpdateSoftcopyCategoryDto } from "./dto/update-softcopy-category.dto";
import { SoftcopyCategoriesService } from "./softcopy-categories.service";

@ApiTags("Softcopy Folders")
@Controller({ path: "softcopy-categories", version: "1" })
export class SoftcopyCategoriesController {
  constructor(private readonly service: SoftcopyCategoriesService) {}

  @Get()
  @RequirePermissions(
    "softcopy-folders.view",
    "softcopy-folders.manage",
    "documents.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List softcopy folders" })
  @ApiOkResponse({ description: "Softcopy folders retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.findAll(query, user!);
  }

  @Get(":id")
  @RequirePermissions(
    "softcopy-folders.view",
    "softcopy-folders.manage",
    "documents.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  findOne(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.findOne(id, user!);
  }

  @Post()
  @RequirePermissions(
    "softcopy-folders.create",
    "softcopy-folders.manage",
  )
  @ApiCreatedResponse({
    description: "Softcopy folder created successfully.",
  })
  create(@Body() dto: CreateSoftcopyCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch(":id")
  @RequirePermissions(
    "softcopy-folders.edit",
    "softcopy-folders.manage",
  )
  update(@Param("id") id: string, @Body() dto: UpdateSoftcopyCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermissions(
    "softcopy-folders.delete",
    "softcopy-folders.manage",
  )
  delete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.delete(id, user);
  }
}
