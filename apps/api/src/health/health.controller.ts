import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      success: true,
      message: 'SME ERP Platform PH API is running',
      data: {
        service: 'api',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
