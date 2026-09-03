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
import { AssetNumbersService } from "./asset-numbers.service";
import { CreateAssetNumberDto } from "./dto/create-asset-number.dto";
import { UpdateAssetNumberDto } from "./dto/update-asset-number.dto";

@ApiTags("Asset Numbers")
@Controller({ path: "asset-numbers", version: "1" })
export class AssetNumbersController {
  constructor(private readonly assetNumbersService: AssetNumbersService) {}

  @Get()
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List asset numbers" })
  @ApiOkResponse({ description: "Asset numbers retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.assetNumbersService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "Get asset number details" })
  @ApiOkResponse({ description: "Asset number retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.assetNumbersService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    "storage-classification.create",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Create asset number" })
  @ApiCreatedResponse({ description: "Asset number created successfully." })
  create(@Body() dto: CreateAssetNumberDto) {
    return this.assetNumbersService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(
    "storage-classification.edit",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Update asset number" })
  @ApiOkResponse({ description: "Asset number updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateAssetNumberDto) {
    return this.assetNumbersService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(
    "storage-classification.delete",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Delete asset number" })
  @ApiOkResponse({ description: "Asset number deleted successfully." })
  remove(@Param("id") id: string) {
    return this.assetNumbersService.remove(id);
  }
}
