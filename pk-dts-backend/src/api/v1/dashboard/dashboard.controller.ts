import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { DashboardService } from "./dashboard.service";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";

@ApiTags("Dashboard")
@Controller({
  path: "dashboard",
  version: "1",
})
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "Get dashboard summary" })
  @ApiOkResponse({ description: "Dashboard summary retrieved successfully." })
  getSummary(@CurrentUser() user?: AuthenticatedUser) {
    return this.dashboardService.getSummary(user!);
  }

  @Get("navigation-counts")
  @RequirePermissions("dashboard.view")
  @ApiOperation({ summary: "Get actionable sidebar notification counts" })
  getNavigationCounts(@CurrentUser() user?: AuthenticatedUser) {
    return this.dashboardService.getNavigationCounts(user!);
  }
}
