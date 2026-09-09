import type { TraceFlowAttributeValue, TraceFlowAttributes } from '../types/protocol.type';
import type { JsonValue } from '../types/json.type';
import { TRACEFLOW_SENSITIVE_KEY_PATTERN } from '../constants';

export function isSensitiveAttributeKey(key: string): boolean {
  return TRACEFLOW_SENSITIVE_KEY_PATTERN.test(key);
}

export function normalizeAttributeValue(value: unknown): TraceFlowAttributeValue | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value.filter((item): item is string | number | boolean => typeof item === 'string' || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item)));

  if (normalized.length === 0) {
    return [];
  }

  const firstType = typeof normalized[0];
  if (!normalized.every((item) => typeof item === firstType)) {
    return undefined;
  }

  if (firstType === 'string') {
    return normalized as string[];
  }

  if (firstType === 'number') {
    return normalized as number[];
  }

  return normalized as boolean[];
}

export function normalizeAttributes(attributes: Readonly<Record<string, unknown>>): TraceFlowAttributes {
  const result: TraceFlowAttributes = {};

  for (const [key, value] of Object.entries(attributes)) {
    const normalized = normalizeAttributeValue(value);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }

  return result;
}

export function toJsonSerializable(value: unknown): JsonValue | undefined {
  return toJsonValue(value, new WeakSet<object>(), 0);
}

export function parseJsonSerializable(value: unknown): JsonValue | undefined {
  if (typeof value !== 'string') {
    return toJsonSerializable(value);
  }

  try {
    return toJsonSerializable(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function toJsonValue(value: unknown, seen: WeakSet<object>, depth: number): JsonValue | undefined {
  if (depth > 8) {
    return undefined;
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const normalized = toJsonValue(item, seen, depth + 1);
      if (normalized !== undefined) {
        items.push(normalized);
      }
    }
    seen.delete(value);
    return items;
  }

  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = toJsonValue(item, seen, depth + 1);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }

  seen.delete(value);
  return result;
}
