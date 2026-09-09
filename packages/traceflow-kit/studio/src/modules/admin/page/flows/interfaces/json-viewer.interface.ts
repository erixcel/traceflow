import type { JsonValue } from '../types/json.type';

export interface JsonViewerProps {
  value: JsonValue;
  label: string;
  fill?: boolean;
}

export interface JsonEntryProps {
  name?: string;
  value: JsonValue;
  depth: number;
}
