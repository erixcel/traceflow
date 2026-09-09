import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TraceFlowHealthDto } from 'traceflow/protocol';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api')
  @ApiOperation({ summary: 'Show TraceFlow Studio status' })
  @ApiResponse({ status: 200, description: 'TraceFlow Studio is running' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check TraceFlow Kit health' })
  @ApiResponse({ status: 200, description: 'The kit is ready to receive spans' })
  health(): TraceFlowHealthDto {
    return this.appService.health();
  }
}
