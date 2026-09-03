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
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";

@ApiTags("Roles")
@Controller({ path: "roles", version: "1" })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions("roles-permissions.view")
  @ApiOperation({ summary: "List roles" })
  @ApiOkResponse({ description: "Roles retrieved successfully." })
  findAll(@Query() query: PaginationQueryDto) {
    return this.rolesService.findAll(query);
  }

  @Get(":id")
  @RequirePermissions("roles-permissions.view")
  @ApiOperation({ summary: "Get role details" })
  @ApiOkResponse({ description: "Role retrieved successfully." })
  findOne(@Param("id") id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Create role" })
  @ApiCreatedResponse({ description: "Role created successfully." })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Update role" })
  @ApiOkResponse({ description: "Role updated successfully." })
  update(@Param("id") id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("roles-permissions.manage")
  @ApiOperation({ summary: "Delete role" })
  @ApiOkResponse({ description: "Role deleted successfully." })
  remove(@Param("id") id: string) {
    return this.rolesService.remove(id);
  }
}
