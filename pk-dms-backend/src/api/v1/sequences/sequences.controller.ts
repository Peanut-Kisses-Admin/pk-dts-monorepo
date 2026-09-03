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
import { CreateSequenceDto } from "./dto/create-sequence.dto";
import { UpdateSequenceDto } from "./dto/update-sequence.dto";
import { SequencesService } from "./sequences.service";

@ApiTags("Sequences")
@Controller({ path: "sequences", version: "1" })
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  @Get()
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List sequences" })
  @ApiOkResponse({ description: "Sequences retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.sequencesService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions(
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "Get sequence details" })
  @ApiOkResponse({ description: "Sequence retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.sequencesService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    "storage-classification.create",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Create sequence" })
  @ApiCreatedResponse({ description: "Sequence created successfully." })
  create(@Body() dto: CreateSequenceDto) {
    return this.sequencesService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(
    "storage-classification.edit",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Update sequence" })
  @ApiOkResponse({ description: "Sequence updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateSequenceDto) {
    return this.sequencesService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(
    "storage-classification.delete",
    "storage-classification.manage",
  )
  @ApiOperation({ summary: "Delete sequence" })
  @ApiOkResponse({ description: "Sequence deleted successfully." })
  remove(@Param("id") id: string) {
    return this.sequencesService.remove(id);
  }
}
