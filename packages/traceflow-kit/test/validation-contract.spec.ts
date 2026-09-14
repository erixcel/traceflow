import { findParamValue, getValidationContract, getValidationInput } from '../studio/src/modules/admin/page/flows/functions/validation-contract.function';

describe('Validation contract Studio helpers', () => {
  const sampleContract = {
    dtoName: 'DashboardFilterDto',
    location: 'query' as const,
    parameters: [
      {
        name: 'startDate',
        in: 'query' as const,
        required: true,
        type: 'string',
        description: 'Start date YYYY-MM-DD',
        example: '2024-01-01',
        rules: [{ name: 'isDateString', description: 'Fecha ISO 8601 (YYYY-MM-DD)' }],
      },
      {
        name: 'limit',
        in: 'query' as const,
        required: false,
        type: 'number',
        default: 10,
        rules: [{ name: 'min', constraints: [1], description: 'Mínimo 1' }],
      },
    ],
  };

  it('parses valid contract from span attributes', () => {
    const span = {
      attributes: {
        'traceflow.validation.schema': JSON.stringify(sampleContract),
      },
    };

    const result = getValidationContract(span);
    expect(result).not.toBeNull();
    expect(result?.dtoName).toBe('DashboardFilterDto');
    expect(result?.parameters).toHaveLength(2);
    expect(result?.parameters[0].name).toBe('startDate');
  });

  it('returns null when schema attribute is absent or malformed', () => {
    expect(getValidationContract(null)).toBeNull();
    expect(getValidationContract({})).toBeNull();
    expect(getValidationContract({ attributes: {} })).toBeNull();
    expect(getValidationContract({ attributes: { 'traceflow.validation.schema': 'invalid json' } })).toBeNull();
    expect(getValidationContract({ attributes: { 'traceflow.validation.schema': '{"parameters":[]}' } })).toBeNull();
  });

  it('finds param value at top level or inside nested wrappers', () => {
    const flatInput = { startDate: '2024-01-01', limit: 10 };
    expect(findParamValue(flatInput, 'startDate')).toBe('2024-01-01');
    expect(findParamValue(flatInput, 'limit')).toBe(10);
    expect(findParamValue(flatInput, 'missing')).toBeUndefined();

    const nestedFilter = {
      filter: {
        startDate: '2024-05-15',
        limit: 25,
      },
    };
    expect(findParamValue(nestedFilter, 'startDate')).toBe('2024-05-15');
    expect(findParamValue(nestedFilter, 'limit')).toBe(25);
    expect(findParamValue(nestedFilter, 'missing')).toBeUndefined();
  });

  it('isolates only DTO fields from the captured HTTP request', () => {
    const input = {
      query: { startDate: '2024-01-01', limit: 10, ignored: 'value' },
      authorization: 'Bearer secret',
      headers: { authorization: 'Bearer secret', accept: 'application/json' },
    };

    expect(getValidationInput(input, sampleContract)).toEqual({ startDate: '2024-01-01', limit: 10 });
    expect(JSON.stringify(getValidationInput(input, sampleContract))).not.toContain('Bearer secret');
  });

  it('falls back to declared DTO fields when the captured input is already flattened', () => {
    const input = { startDate: '2024-05-15', limit: 25, authorization: 'Bearer secret' };
    expect(getValidationInput(input, sampleContract)).toEqual({ startDate: '2024-05-15', limit: 25 });
  });
});
