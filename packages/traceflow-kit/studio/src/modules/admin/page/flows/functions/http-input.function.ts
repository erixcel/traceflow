import { DEFAULT_HTTP_INPUT_PREFERENCES, HTTP_INPUT_SECTIONS, HTTP_INPUT_STORAGE_KEY } from '../constants/http-input.constant';
import type { HttpInputPreferences, HttpInputSectionValue } from '../interfaces/http-input.interface';
import type { JsonValue } from '../types/json.type';

export function readHttpInputPreferences(): HttpInputPreferences {
  try {
    const value = window.localStorage.getItem(HTTP_INPUT_STORAGE_KEY);
    if (!value) return cloneDefaultHttpInputPreferences();
    const parsed = JSON.parse(value) as Partial<HttpInputPreferences>;
    return {
      visible: Object.fromEntries(
        HTTP_INPUT_SECTIONS.map(({ key }) => [key, typeof parsed.visible?.[key] === 'boolean' ? parsed.visible[key] : DEFAULT_HTTP_INPUT_PREFERENCES.visible[key]]),
      ) as HttpInputPreferences['visible'],
      hideEmpty: typeof parsed.hideEmpty === 'boolean' ? parsed.hideEmpty : DEFAULT_HTTP_INPUT_PREFERENCES.hideEmpty,
    };
  } catch {
    return cloneDefaultHttpInputPreferences();
  }
}

export function persistHttpInputPreferences(preferences: HttpInputPreferences): void {
  try {
    window.localStorage.setItem(HTTP_INPUT_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Studio sigue funcionando cuando el navegador no permite almacenamiento local.
  }
}

export function cloneDefaultHttpInputPreferences(): HttpInputPreferences {
  return { visible: { ...DEFAULT_HTTP_INPUT_PREFERENCES.visible }, hideEmpty: DEFAULT_HTTP_INPUT_PREFERENCES.hideEmpty };
}

export function getHttpInputSections(input: JsonValue | undefined): HttpInputSectionValue[] {
  const record = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return HTTP_INPUT_SECTIONS.map((definition) => ({ ...definition, value: record[definition.key] }));
}

export function getVisibleHttpInputSections(input: JsonValue | undefined, preferences: HttpInputPreferences, omit: readonly string[] = []): HttpInputSectionValue[] {
  return getHttpInputSections(input).filter(({ key, value }) => preferences.visible[key] && !omit.includes(key) && (!preferences.hideEmpty || !isEmptyHttpInputValue(value)));
}

export function filterHttpInput(input: JsonValue | undefined, preferences: HttpInputPreferences): JsonValue | undefined {
  const sections = getVisibleHttpInputSections(input, preferences);
  return sections.length ? Object.fromEntries(sections.map(({ key, value }) => [key, value ?? null])) : undefined;
}

export function getHttpInputFields(value: JsonValue | undefined): Array<[string, JsonValue]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value);
}

export function summarizeHttpInputSection(section: HttpInputSectionValue): string {
  const { key, value } = section;
  if (isEmptyHttpInputValue(value)) return 'Vacío';
  if (key === 'authorization' && typeof value === 'string') return value;
  if (Array.isArray(value)) return `${value.length} elementos`;
  if (value && typeof value === 'object') {
    const count = Object.keys(value).length;
    return `${count} ${key === 'headers' ? 'headers' : key === 'cookies' ? 'cookies' : 'campos'}`;
  }
  return String(value);
}

export function isEmptyHttpInputValue(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && Object.keys(value).length === 0;
}
