import type { TraceFlowValidationContractDto } from './interfaces/protocol.interface';

export const tracedDtoRegistry = new Map<string, { targetClass: unknown; contract: TraceFlowValidationContractDto }>();
