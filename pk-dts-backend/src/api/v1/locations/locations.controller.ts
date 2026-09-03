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
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationsService } from "./locations.service";

@ApiTags("Locations")
@Controller({ path: "locations", version: "1" })
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @RequirePermissions(
    "location-management.view",
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "List locations" })
  @ApiOkResponse({ description: "Locations retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.locationsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions(
    "location-management.view",
    "storage-classification.view",
    "documents.create",
    "documents.edit",
    "document-requests.create",
    "document-requests.edit",
  )
  @ApiOperation({ summary: "Get location details" })
  @ApiOkResponse({ description: "Location retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.locationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    "location-management.create",
    "location-management.manage",
  )
  @ApiOperation({ summary: "Create location" })
  @ApiCreatedResponse({ description: "Location created successfully." })
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("location-management.edit", "location-management.manage")
  @ApiOperation({ summary: "Update location" })
  @ApiOkResponse({ description: "Location updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions(
    "location-management.archive",
    "location-management.manage",
  )
  @ApiOperation({ summary: "Archive location" })
  @ApiOkResponse({ description: "Location archived successfully." })
  remove(@Param("id") id: string) {
    return this.locationsService.remove(id);
  }
}
