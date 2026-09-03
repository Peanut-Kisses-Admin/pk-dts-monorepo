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
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { PermissionsService } from "./permissions.service";

@ApiTags("Permissions")
@Controller({ path: "permissions", version: "1" })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions("roles-permissions.view")
  @ApiOperation({ summary: "List permissions" })
  @ApiOkResponse({ description: "Permissions retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.permissionsService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("roles-permissions.view")
  @ApiOperation({ summary: "Get permission details" })
  @ApiOkResponse({ description: "Permission retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.permissionsService.findOne(id);
  }

  @Post()
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Create permission" })
  @ApiCreatedResponse({ description: "Permission created successfully." })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Update permission" })
  @ApiOkResponse({ description: "Permission updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Delete permission" })
  @ApiOkResponse({ description: "Permission deleted successfully." })
  remove(@Param("id") id: string) {
    return this.permissionsService.remove(id);
  }
}
