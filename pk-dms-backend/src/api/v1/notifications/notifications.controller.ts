import { Body, Controller, Get, Patch, Param } from '@nestjs/common';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user.interface';
import { NotificationsService } from './notifications.service';

@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.notifications.list(user); }
  @Patch('read-all') readAll(@CurrentUser() user: AuthenticatedUser) { return this.notifications.readAll(user); }
  @Patch(':eventKey/read') read(@Param('eventKey') eventKey: string, @CurrentUser() user: AuthenticatedUser) { return this.notifications.read(user, decodeURIComponent(eventKey)); }
}
