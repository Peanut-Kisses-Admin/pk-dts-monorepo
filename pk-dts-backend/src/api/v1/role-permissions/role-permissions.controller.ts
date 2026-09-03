import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateRolePermissionDto } from "./dto/create-role-permission.dto";
import { RolePermissionsService } from "./role-permissions.service";

@ApiTags("Role Permissions")
@Controller({ path: "role-permissions", version: "1" })
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Get()
  @RequirePermissions("roles-permissions.view")
  @ApiOperation({ summary: "List role permissions" })
  @ApiOkResponse({ description: "Role permissions retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolePermissionsService.findAll(query);
  }

  @Post()
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Assign permission to role" })
  @ApiCreatedResponse({ description: "Permission assigned successfully." })
  create(@Body() dto: CreateRolePermissionDto) {
    return this.rolePermissionsService.create(dto);
  }

  @Delete(":id")
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Remove role permission" })
  @ApiOkResponse({ description: "Role permission removed successfully." })
  remove(@Param("id") id: string) {
    return this.rolePermissionsService.remove(id);
  }
}
