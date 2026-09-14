import type { TraceFlowValidationContractDto } from 'traceflow/protocol';
import type { JsonValue } from '../types/json.type';

const LOCATION_KEYS: Record<NonNullable<TraceFlowValidationContractDto['location']>, string[]> = {
  query: ['query'],
  body: ['body'],
  param: ['param', 'params'],
  header: ['header', 'headers'],
  custom: [],
};

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

export function findParamValue(input: unknown, paramName: string): JsonValue | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  if (paramName in obj) return obj[paramName] as JsonValue;

  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>;
      if (paramName in nested) {
        return nested[paramName] as JsonValue;
      }
    }
  }

  return undefined;
}

/** Build the validation payload without leaking unrelated HTTP metadata. */
export function getValidationInput(input: JsonValue | undefined, contract: TraceFlowValidationContractDto | null): JsonValue | undefined {
  if (input === undefined) return undefined;

  if (!contract) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    return firstDefinedLocation(input, ['query', 'body', 'formData', 'param', 'params']);
  }

  const source = getContractSource(input, contract);
  const fields: Record<string, JsonValue> = {};
  for (const parameter of contract.parameters) {
    const scopedValue = findParamValue(source, parameter.name);
    const value = scopedValue === undefined ? findParamValue(input, parameter.name) : scopedValue;
    if (value !== undefined) fields[parameter.name] = value;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function getContractSource(input: JsonValue, contract: TraceFlowValidationContractDto): JsonValue {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const locationKeys = new Set<string>();
  if (contract.location) LOCATION_KEYS[contract.location].forEach((key) => locationKeys.add(key));
  contract.parameters.forEach((parameter) => {
    if (parameter.in) LOCATION_KEYS[parameter.in].forEach((key) => locationKeys.add(key));
  });
  return firstDefinedLocation(input, [...locationKeys]) ?? input;
}

function firstDefinedLocation(input: Record<string, JsonValue>, keys: string[]): JsonValue | undefined {
  for (const key of keys) {
    if (input[key] !== undefined) return input[key];
  }
  return undefined;
}
