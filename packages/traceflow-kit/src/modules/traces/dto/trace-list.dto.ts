import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { TraceFlowStatus } from 'traceflow/protocol';

export class TraceListFiltersDto {
  @ApiPropertyOptional({ description: 'Maximum number of traces', default: 50, minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filter by service name', example: 'orders-api' })
  @IsString()
  @IsOptional()
  serviceName?: string;

  @ApiPropertyOptional({ enum: ['unset', 'success', 'error'], description: 'Filter by trace status' })
  @IsEnum(['unset', 'success', 'error'])
  @IsOptional()
  status?: TraceFlowStatus;
}
