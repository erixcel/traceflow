import { Injectable } from '@nestjs/common';
import type { TraceFlowHealthDto } from 'traceflow/protocol';
import { TraceService } from './modules/traces/trace.service';

@Injectable()
export class AppService {
  constructor(private readonly traceService: TraceService) {}

  getHello(): string {
    return 'TraceFlow Studio';
  }

  health(): TraceFlowHealthDto {
    return this.traceService.health();
  }
}
