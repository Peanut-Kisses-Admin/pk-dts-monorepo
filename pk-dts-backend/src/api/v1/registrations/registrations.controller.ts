import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { Public } from "../../../common/auth/public.decorator";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { CreateRegistrationDto } from "./dto/create-registration.dto";
import { RegistrationEmailDto } from "./dto/registration-email.dto";
import { RegistrationStatusDto } from "./dto/registration-status.dto";
import { ReviewRegistrationDto } from "./dto/review-registration.dto";
import { RegistrationsService } from "./registrations.service";

@ApiTags("Account Registrations")
@Controller({ path: "registrations", version: "1" })
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Public() @Get("roles") @ApiOperation({ summary: "List roles available to registration applicants" })
  publicRoles() { return this.registrationsService.publicRoles(); }

  @Public() @Post() @ApiCreatedResponse({ description: "Registration request submitted." })
  create(@Body() dto: CreateRegistrationDto) { return this.registrationsService.create(dto); }

  @Public() @Post("status") @ApiOkResponse({ description: "Registration status retrieved." })
  status(@Body() dto: RegistrationStatusDto) { return this.registrationsService.status(dto); }

  @Public() @Post("reference") @ApiOkResponse({ description: "Latest registration reference retrieved for an email." })
  reference(@Body() dto: RegistrationEmailDto) { return this.registrationsService.findReference(dto); }

  @Get() @RequirePermissions("user-accounts.approve", "user-accounts.manage")
  findAll(@Query() query: PaginationQueryDto) { return this.registrationsService.findAll(query); }

  @Patch(":id/review") @RequirePermissions("user-accounts.approve", "user-accounts.manage")
  review(@Param("id") id: string, @Body() dto: ReviewRegistrationDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.registrationsService.review(id, dto, user?.user_id ?? "");
  }
}
