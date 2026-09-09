import { getMethodParameterNames, mapMethodArguments } from '../../../../../src/modules/traces/shared/functions/method-argument.function';

describe('method argument helpers', () => {
  it('detects parameter names, defaults and rest arguments', () => {
    class CustomerService {
      findAll(filters: unknown, limit = 10, ...labels: string[]): void {
        void filters;
        void limit;
        void labels;
      }
    }

    expect(getMethodParameterNames(CustomerService.prototype.findAll)).toEqual(['filters', 'limit', 'labels']);
  });

  it('maps values to detected names and falls back for destructuring', () => {
    class CustomerService {
      findAll({ page }: { page: number }, id: number): void {
        void page;
        void id;
      }
    }

    const names = getMethodParameterNames(CustomerService.prototype.findAll);
    expect(names).toEqual(['arg1', 'id']);
    expect(mapMethodArguments(names, [{ page: 2 }, 7])).toEqual({ arg1: { page: 2 }, id: 7 });
    expect(mapMethodArguments([], [])).toBeUndefined();
  });
});
