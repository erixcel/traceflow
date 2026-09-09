import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TraceSpanErrorDto {
  @ApiProperty({ example: 'ValidationError' })
  name!: string;

  @ApiProperty({ example: 'The request is invalid' })
  message!: string;

  @ApiPropertyOptional({ example: 'ValidationError: The request is invalid' })
  stack?: string;
}

export class TraceFlowNodeDto {
  @ApiProperty({ example: 'controller-1' })
  id!: string;

  @ApiProperty({ example: 'List customers' })
  name!: string;

  @ApiProperty({ enum: ['controller', 'service', 'method', 'table', 'validation', 'transformation', 'external-api', 'custom'], example: 'controller' })
  type!: string;

  @ApiProperty({ example: 'CustomerController' })
  className!: string;

  @ApiProperty({ example: 'findAll' })
  methodName!: string;

  @ApiPropertyOptional({ example: 'Returns the latest customers' })
  description?: string;
}

export class TraceFlowEdgeDto {
  @ApiProperty({ example: 'controller-1' })
  source!: string;

  @ApiProperty({ example: 'service-1' })
  target!: string;

  @ApiPropertyOptional({ example: false })
  parallel?: boolean;
}

export class TraceFlowDefinitionDto {
  @ApiProperty({ example: 'customer-list' })
  id!: string;

  @ApiProperty({ example: 'List customers' })
  name!: string;

  @ApiProperty({ example: 'controller-1' })
  rootNodeId!: string;

  @ApiProperty({ type: () => [TraceFlowNodeDto], minItems: 1, maxItems: 500 })
  nodes!: TraceFlowNodeDto[];

  @ApiProperty({ type: () => [TraceFlowEdgeDto], maxItems: 1_000 })
  edges!: TraceFlowEdgeDto[];
}

export class TraceSpanDto {
  @ApiProperty({ example: 1 })
  protocolVersion!: number;

  @ApiProperty({ example: 'backend-cachorros' })
  serviceName!: string;

  @ApiProperty({ example: '0123456789abcdef0123456789abcdef' })
  traceId!: string;

  @ApiProperty({ example: '0123456789abcdef' })
  spanId!: string;

  @ApiProperty({ nullable: true, example: null })
  parentSpanId!: string | null;

  @ApiProperty({ example: 'CustomerController.findAll' })
  name!: string;

  @ApiProperty({ enum: ['controller', 'service', 'method', 'table', 'validation', 'transformation', 'external-api', 'custom'], example: 'controller' })
  type!: string;

  @ApiPropertyOptional({ type: [String], example: ['table', 'select'], default: [] })
  labels!: string[];

  @ApiProperty({ nullable: true, example: 'CustomerController' })
  className!: string | null;

  @ApiProperty({ nullable: true, example: 'findAll' })
  methodName!: string | null;

  @ApiProperty({ nullable: true, example: 'Lists all customers' })
  description!: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-08-31T12:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-31T12:00:00.010Z' })
  endedAt!: string;

  @ApiProperty({ example: 10 })
  durationMs!: number;

  @ApiProperty({ enum: ['unset', 'success', 'error'], example: 'success' })
  status!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Arguments captured by @Trace', example: { filters: { page: 1, limit: 10 } } })
  input?: unknown;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Value returned by the traced method', example: { data: [], total: 0 } })
  output?: unknown;

  @ApiProperty({ type: 'object', additionalProperties: true, example: { 'http.method': 'GET' } })
  attributes!: Record<string, unknown>;

  @ApiProperty({ type: () => TraceSpanErrorDto, nullable: true, example: null })
  error!: TraceSpanErrorDto | null;
}

export class TraceSpanBatchDto {
  @ApiProperty({ example: 1 })
  protocolVersion!: number;

  @ApiProperty({ example: 'traceflow' })
  sdkName!: string;

  @ApiProperty({ example: '0.1.0' })
  sdkVersion!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-31T12:00:00.000Z' })
  sentAt!: string;

  @ApiProperty({ type: () => [TraceSpanDto], minItems: 1, maxItems: 1_000 })
  spans!: TraceSpanDto[];

  @ApiPropertyOptional({ type: () => [TraceFlowDefinitionDto], maxItems: 50 })
  flows?: TraceFlowDefinitionDto[];
}
