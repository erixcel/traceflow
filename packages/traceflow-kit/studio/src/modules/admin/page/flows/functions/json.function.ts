import type { JsonValue } from '../types/json.type';

export function parseJsonAttributes(attributes: Readonly<Record<string, unknown>>): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, parseJsonValue(value)]));
}

export function parseJsonValue(value: unknown): JsonValue {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return value;
    }

    try {
      return parseJsonValue(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(parseJsonValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, parseJsonValue(child)]));
  }

  return typeof value === 'number' || typeof value === 'boolean' || value === null ? value : String(value);
}

export function isJsonContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object';
}

export function formatJsonPrimitive(value: string | number | boolean | null): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

export function getJsonPrimitiveClass(value: string | number | boolean | null): string {
  return value === null
    ? 'text-zinc-400 italic'
    : typeof value === 'string'
      ? 'text-lime-700 dark:text-lime-300'
      : typeof value === 'number'
        ? 'text-violet-600 dark:text-violet-300'
        : 'text-amber-700 dark:text-amber-300';
}
