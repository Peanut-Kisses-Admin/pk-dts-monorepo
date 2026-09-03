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
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { AreasService } from "./areas.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";

@ApiTags("Areas")
@Controller({ path: "areas", version: "1" })
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List areas" })
  @ApiOkResponse({ description: "Areas retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.areasService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "Get area details" })
  @ApiOkResponse({ description: "Area retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.areasService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    "storage-classification.create",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Create area" })
  @ApiCreatedResponse({ description: "Area created successfully." })
  create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(
    "storage-classification.edit",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Update area" })
  @ApiOkResponse({ description: "Area updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(
    "storage-classification.delete",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Delete area" })
  @ApiOkResponse({ description: "Area deleted successfully." })
  remove(@Param("id") id: string) {
    return this.areasService.remove(id);
  }
}
