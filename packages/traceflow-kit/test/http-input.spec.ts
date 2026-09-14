import { cloneDefaultHttpInputPreferences, filterHttpInput, getVisibleHttpInputSections } from '../studio/src/modules/admin/page/flows/functions/http-input.function';

describe('Studio HTTP input preferences', () => {
  it('hides empty sections and filters captured values using the saved visibility', () => {
    const input = {
      query: { page: '1' },
      body: {},
      formData: {},
      cookies: {},
      authorization: 'Bearer token',
      headers: { accept: 'application/json' },
    };
    const preferences = cloneDefaultHttpInputPreferences();

    expect(getVisibleHttpInputSections(input, preferences).map((section) => section.key)).toEqual(['query', 'authorization', 'headers']);
    expect(filterHttpInput(input, preferences)).toEqual({ query: { page: '1' }, authorization: 'Bearer token', headers: { accept: 'application/json' } });
  });

  it('can show captured empty sections when requested', () => {
    const preferences = cloneDefaultHttpInputPreferences();
    preferences.hideEmpty = false;
    expect(getVisibleHttpInputSections({ query: {} }, preferences).map((section) => section.key)).toEqual(['query', 'formData', 'body', 'authorization', 'headers']);
    expect(preferences.visible).toMatchObject({ cookies: false, headers: true });
  });
});
