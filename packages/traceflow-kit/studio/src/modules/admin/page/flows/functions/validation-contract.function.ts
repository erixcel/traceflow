import type { TraceFlowValidationContractDto } from 'traceflow/protocol';

export function getValidationContract(span: { attributes?: Record<string, unknown> } | null | undefined): TraceFlowValidationContractDto | null {
  if (!span?.attributes) return null;
  const raw = span.attributes['traceflow.validation.schema'];
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw) as TraceFlowValidationContractDto;
    if (parsed && Array.isArray(parsed.parameters) && parsed.parameters.length > 0) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function findParamValue(input: unknown, paramName: string): unknown {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  if (paramName in obj) return obj[paramName];

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (paramName in nested) {
        return nested[paramName];
      }
    }
  }

  return undefined;
}
