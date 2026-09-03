import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../../common/auth/public.decorator";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { UpdateSystemAppearanceDto } from "./dto/update-system-appearance.dto";
import { SystemSettingsService } from "./system-settings.service";

@ApiTags("System Settings")
@Controller({ path: "system-settings", version: "1" })
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService) {}

  @Public()
  @Get("appearance")
  @ApiOperation({ summary: "Get public system appearance settings" })
  @ApiOkResponse({ description: "System appearance retrieved successfully." })
  getAppearance() {
    return this.settings.getAppearance();
  }

  @Patch("appearance")
  @RequirePermissions("system-settings.manage")
  @ApiOperation({ summary: "Update system appearance settings" })
  @ApiOkResponse({ description: "System appearance updated successfully." })
  updateAppearance(@Body() dto: UpdateSystemAppearanceDto) {
    return this.settings.updateAppearance(dto);
  }
}
