import { performance } from 'node:perf_hooks';
import { monotonicUnixTime } from '../../../../../src/modules/traces/shared/functions/monotonic-time.function';

describe('monotonicUnixTime', () => {
  afterEach(() => jest.restoreAllMocks());

  it('normalizes nanosecond rounding at a second boundary', () => {
    const untilNextSecond = 1_000 - (performance.timeOrigin % 1_000);
    jest.spyOn(performance, 'now').mockReturnValue(untilNextSecond - 0.0000001);
    expect(monotonicUnixTime()).toEqual([Math.floor(performance.timeOrigin / 1_000) + 1, 0]);
  });

  it('preserves sub-microsecond intervals without adding elapsed time to a large epoch float', () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(10.0001);
    const start = monotonicUnixTime();
    const end = monotonicUnixTime();
    expect((end[0] - start[0]) * 1_000_000_000 + end[1] - start[1]).toBe(100);
  });
});
