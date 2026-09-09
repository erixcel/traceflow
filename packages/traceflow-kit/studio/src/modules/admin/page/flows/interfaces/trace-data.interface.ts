import type { JsonValue } from '../types/json.type';

export interface TraceDataSections {
  input?: JsonValue;
  output?: JsonValue;
  attributes: Record<string, JsonValue>;
}
