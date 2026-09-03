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
import { CreateSpecificDto } from "./dto/create-specific.dto";
import { UpdateSpecificDto } from "./dto/update-specific.dto";
import { SpecificsService } from "./specifics.service";

@ApiTags("Specifics")
@Controller({ path: "specifics", version: "1" })
export class SpecificsController {
  constructor(private readonly specificsService: SpecificsService) {}

  @Get()
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List specifics" })
  @ApiOkResponse({ description: "Specifics retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.specificsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "Get specific details" })
  @ApiOkResponse({ description: "Specific retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.specificsService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    "storage-classification.create",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Create specific" })
  @ApiCreatedResponse({ description: "Specific created successfully." })
  create(@Body() dto: CreateSpecificDto) {
    return this.specificsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(
    "storage-classification.edit",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Update specific" })
  @ApiOkResponse({ description: "Specific updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateSpecificDto) {
    return this.specificsService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(
    "storage-classification.delete",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Delete specific" })
  @ApiOkResponse({ description: "Specific deleted successfully." })
  remove(@Param("id") id: string) {
    return this.specificsService.remove(id);
  }
}
