import { normalizeLabels } from '../../../../../src/modules/traces/shared/functions/labels.function';

describe('normalizeLabels', () => {
  it('trims, removes duplicates and ignores invalid labels', () => {
    expect(normalizeLabels([' table ', 'select', 'table', 42, '', '  '])).toEqual(['table', 'select']);
  });

  it('limits the number of labels shown by Studio', () => {
    expect(normalizeLabels(Array.from({ length: 20 }, (_, index) => `label-${index}`))).toHaveLength(12);
  });
});
