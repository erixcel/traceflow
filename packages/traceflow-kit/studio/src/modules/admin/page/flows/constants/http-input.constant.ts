import type { HttpInputPreferences, HttpInputSectionDefinition } from '../interfaces/http-input.interface';

export const HTTP_INPUT_STORAGE_KEY = 'traceflow.studio.http-input.v2';

export const HTTP_INPUT_SECTIONS: readonly HttpInputSectionDefinition[] = [
  { key: 'query', label: 'Query params' },
  { key: 'formData', label: 'Form-data' },
  { key: 'cookies', label: 'Cookies' },
  { key: 'body', label: 'Body' },
  { key: 'authorization', label: 'Autorización' },
  { key: 'headers', label: 'Headers' },
];

export const DEFAULT_HTTP_INPUT_PREFERENCES: Readonly<HttpInputPreferences> = {
  visible: {
    query: true,
    formData: true,
    cookies: false,
    body: true,
    authorization: true,
    headers: true,
  },
  hideEmpty: true,
};
