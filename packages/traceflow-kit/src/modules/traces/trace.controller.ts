import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { TraceFlowIngestResultDto } from 'traceflow/protocol';
import { TraceListFiltersDto } from './dto/trace-list.dto';
import { TraceSpanBatchDto } from './dto/trace-span-batch.dto';
import { TraceService } from './trace.service';

@ApiTags('traceflow')
@Controller('api/v1')
export class TraceController {
  constructor(private readonly traceService: TraceService) {}

  @Post('spans/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Ingest a batch of OpenTelemetry spans' })
  @ApiBody({ type: TraceSpanBatchDto })
  @ApiResponse({ status: 202, description: 'Spans accepted' })
  @ApiResponse({ status: 400, description: 'Invalid span batch' })
  ingest(@Body() body: unknown): TraceFlowIngestResultDto {
    return this.traceService.ingest(body);
  }

  @Get('traces')
  @ApiOperation({ summary: 'List recent traces' })
  @ApiResponse({ status: 200, description: 'Trace summaries' })
  list(@Query() query: TraceListFiltersDto) {
    return this.traceService.list(query);
  }

  @Get('traces/latest')
  @ApiOperation({ summary: 'Get the latest trace' })
  @ApiResponse({ status: 200, description: 'The latest trace' })
  latest() {
    return this.traceService.latest();
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Get a trace by ID' })
  @ApiParam({ name: 'traceId', description: 'Trace identifier' })
  @ApiResponse({ status: 200, description: 'Trace details' })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  get(@Param('traceId') traceId: string) {
    return this.traceService.get(traceId);
  }

  @Delete('traces')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all traces' })
  @ApiResponse({ status: 204, description: 'Traces deleted' })
  clear(): void {
    this.traceService.clear();
  }

  @Delete('traces/:traceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trace by ID' })
  @ApiParam({ name: 'traceId', description: 'Trace identifier' })
  @ApiResponse({ status: 204, description: 'Trace deleted' })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  remove(@Param('traceId') traceId: string): void {
    this.traceService.remove(traceId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Subscribe to trace updates using SSE' })
  @ApiResponse({ status: 200, description: 'Server-sent events stream' })
  events(@Req() request: FastifyRequest, @Res() reply: FastifyReply): void {
    this.traceService.openEventStream(request, reply);
  }
}
