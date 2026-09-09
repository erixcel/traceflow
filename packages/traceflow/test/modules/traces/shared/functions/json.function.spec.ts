import { normalizeAttributes, parseJsonSerializable, toJsonSerializable } from '../../../../../src/modules/traces/shared/functions/json.function';

describe('TraceFlow JSON helpers', () => {
  it('preserves supported attributes, including sensitive-looking names', () => {
    expect(
      normalizeAttributes({
        customerId: 42,
        active: true,
        authorization: 'secret',
        password: 'plain-text-password',
      }),
    ).toEqual({
      customerId: 42,
      active: true,
      authorization: 'secret',
      password: 'plain-text-password',
    });
  });

  it('preserves sensitive-looking keys while removing circular references', () => {
    const value: { password: string; self?: unknown } = { password: 'plain-text-password' };
    value.self = value;

    expect(toJsonSerializable(value)).toEqual({ password: 'plain-text-password' });
  });

  it('restores serialized captures as JSON values', () => {
    expect(parseJsonSerializable('{"filters":{"page":1}}')).toEqual({ filters: { page: 1 } });
    expect(parseJsonSerializable('invalid JSON')).toBeUndefined();
  });
});
