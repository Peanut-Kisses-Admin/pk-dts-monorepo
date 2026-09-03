import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth/public.decorator';

@ApiTags('Health')
@Controller({
  path: 'health',
  version: '1',
})
export class AppController {
  @Get()
  @Public()
  @ApiOkResponse({ description: 'API health status.' })
  health() {
    return {
      name: 'Document Tracking System API',
      status: 'ok',
      version: 'v1',
    };
  }
}
