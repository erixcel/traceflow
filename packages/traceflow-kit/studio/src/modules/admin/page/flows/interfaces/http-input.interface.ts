import type { JsonValue } from '../types/json.type';
import type { HttpInputSection } from '../types/http-input.type';

export interface HttpInputPreferences {
  visible: Record<HttpInputSection, boolean>;
  hideEmpty: boolean;
}

export interface HttpInputStore {
  preferences: HttpInputPreferences;
  setSection: (section: HttpInputSection, visible: boolean) => void;
  setHideEmpty: (hideEmpty: boolean) => void;
  reset: () => void;
}

export interface HttpInputSectionDefinition {
  key: HttpInputSection;
  label: string;
}

export interface HttpInputSectionValue extends HttpInputSectionDefinition {
  value: JsonValue | undefined;
}

export interface HttpInputSummaryProps {
  input: JsonValue | undefined;
  omit?: readonly HttpInputSection[];
}
