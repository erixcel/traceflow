import { EventEmitter } from 'node:events';
import { context, trace as traceApi } from '@opentelemetry/api';
import { InMemorySpanExporter, NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Pool, type PoolConfig } from 'pg';
import { instrumentPgClient, instrumentPgPool } from '../../../../../src/modules/traces/manual/functions/pg-instrumentation.function';
import { runTraceSpan } from '../../../../../src/modules/traces/shared/functions/trace-span.function';
import { readableSpanToTraceFlowSpan } from '../../../../../src/modules/traces/shared/functions/span-converter.function';

describe('PostgreSQL execution instrumentation', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

  beforeAll(() => provider.register());
  afterEach(() => exporter.reset());
  afterAll(async () => {
    await provider.shutdown();
    context.disable();
    traceApi.disable();
  });

  function finishedSpans() {
    return exporter.getFinishedSpans().map((span) => readableSpanToTraceFlowSpan(span, 'test'));
  }

  function querySpans() {
    return finishedSpans().filter((span) => span.attributes['traceflow.db.query'] === true);
  }

  it('records one executed query with all JOIN tables, preserving the driver result', async () => {
    const client = instrumentPgClient(new FakeClient());
    const sql = 'SELECT u.id FROM users u LEFT JOIN pets p ON p.owner_id = u.id';
    let result: FakeQueryResult | undefined;
    await runTraceSpan('request', async () => {
      result = await client.query(sql);
    });
    await provider.forceFlush();

    expect(result).toBe(client.result);
    expect(client.calls).toHaveLength(1);
    const queries = querySpans();
    expect(queries).toHaveLength(1);
    expect(queries[0].attributes).toMatchObject({ 'db.tables': ['users', 'pets'], 'db.operation.name': 'SELECT', 'traceflow.db.tables.status': 'parsed' });
    expect(queries[0].output).toMatchObject({ rowCount: 1 });
    expect(queries[0].parentSpanId).toBe(finishedSpans().find((span) => span.name === 'request')!.spanId);
  });

  it('preserves callback return values, receiver, and the caller context', async () => {
    const client = instrumentPgClient(new FakeClient());
    await runTraceSpan('callback request', async (parent) => {
      await new Promise<void>((resolve, reject) => {
        const returned = client.query('SELECT * FROM users WHERE id = $1', [7], (error, result) => {
          try {
            expect(error).toBeNull();
            expect(result).toBe(client.result);
            expect(traceApi.getActiveSpan()?.spanContext().spanId).toBe(parent.spanContext().spanId);
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        });
        expect(returned).toBeUndefined();
      });
    });
    await provider.forceFlush();
    expect(client.calls[0]).toMatchObject({ values: [7], receiver: client });
    expect(querySpans()).toHaveLength(1);
    expect(querySpans()[0].status).toBe('success');
  });

  it('preserves synchronous, promise, and callback errors and ends their spans', async () => {
    const client = instrumentPgClient(new FakeClient());
    await runTraceSpan('error request', async () => {
      expect(() => client.query('SELECT * FROM throw_sync')).toThrow(client.failure);
      await expect(client.query('SELECT * FROM fail_async')).rejects.toBe(client.failure);
      await new Promise<void>((resolve, reject) => {
        client.query('SELECT * FROM fail_async', (error) => {
          try {
            expect(error).toBe(client.failure);
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        });
      });
    });
    await provider.forceFlush();
    expect(querySpans()).toHaveLength(3);
    expect(querySpans().every((span) => span.status === 'error')).toBe(true);
  });

  it('supports callbacks and parameters in immutable query configs without mutating them', async () => {
    const client = instrumentPgClient(new FakeClient(), { capture: { statement: true, parameters: true } });
    const sql = 'SELECT * FROM users WHERE id = $1';
    await runTraceSpan('config request', async () => {
      await new Promise<void>((resolve, reject) => {
        const callback: FakeQueryCallback = (error, result) => {
          try {
            expect(error).toBeNull();
            expect(result).toBe(client.result);
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        };
        const config = Object.freeze({ text: sql, values: [7], callback });
        expect(client.query(config)).toBeUndefined();
        expect(config.callback).toBe(callback);
      });
    });
    await provider.forceFlush();
    expect(querySpans()).toHaveLength(1);
    expect(querySpans()[0].attributes['db.query.text']).toBe(sql);
    expect(querySpans()[0].input).toEqual({ parameters: [7] });
  });

  it('captures SQL text and result rows when capture is configured with statement and result', async () => {
    const client = instrumentPgClient(new FakeClient(), { capture: { statement: true, result: true } });
    const sql = 'SELECT * FROM users WHERE id = $1';
    await runTraceSpan('result request', async () => {
      await client.query(sql, [7]);
    });
    await provider.forceFlush();
    const query = querySpans()[0];
    expect(query.attributes['db.query.text']).toBe(sql);
    expect(query.output).toEqual({ rowCount: 1, rows: [{ id: 7 }] });
  });

  it('captures all query data when capture is set to true', async () => {
    const client = instrumentPgClient(new FakeClient(), { capture: true });
    const sql = 'SELECT * FROM users WHERE id = $1';
    await runTraceSpan('capture all request', async () => {
      await client.query(sql, [42]);
    });
    await provider.forceFlush();
    const query = querySpans()[0];
    expect(query.attributes['db.query.text']).toBe(sql);
    expect(query.input).toEqual({ parameters: [42] });
    expect(query.output).toEqual({ rowCount: 1, rows: [{ id: 7 }] });
  });

  it('omits SQL text and parameters by default while still identifying tables', async () => {
    const client = instrumentPgClient(new FakeClient());
    await runTraceSpan('private request', async () => client.query('SELECT * FROM users WHERE token = $1', ['private-token']));
    await provider.forceFlush();
    const query = querySpans()[0];
    expect(query.attributes['db.query.text']).toBeUndefined();
    expect(query.input).toBeUndefined();
    expect(query.attributes['db.tables']).toEqual(['users']);
    expect(JSON.stringify(query)).not.toContain('private-token');
  });

  it('preserves execution when PostgreSQL syntax is unsupported and marks tables unavailable', async () => {
    const client = instrumentPgClient(new FakeClient());
    const sql = 'MERGE INTO users u USING customers c ON u.id = c.id WHEN MATCHED THEN UPDATE SET name = c.name';
    await runTraceSpan('merge request', async () => expect(client.query(sql)).resolves.toBe(client.result));
    await provider.forceFlush();
    expect(querySpans()).toHaveLength(1);
    expect(querySpans()[0].attributes).toMatchObject({ 'db.tables': [], 'traceflow.db.tables.status': 'unavailable' });
    expect(querySpans()[0].status).toBe('success');
  });

  it('does not create startup traces or query spans when disabled', async () => {
    const client = instrumentPgClient(new FakeClient());
    const disabledClient = instrumentPgClient(new FakeClient(), { enabled: false });
    await client.query('SELECT * FROM users');
    await runTraceSpan('disabled request', async () => disabledClient.query('SELECT * FROM pets'));
    await provider.forceFlush();
    expect(querySpans()).toHaveLength(0);
    expect(finishedSpans().map((span) => span.name)).toEqual(['disabled request']);
    expect(client.calls).toHaveLength(1);
    expect(disabledClient.calls).toHaveLength(1);
  });

  it('is idempotent and resolves repeated named prepared statements per client', async () => {
    const client = new FakeClient();
    expect(instrumentPgClient(client)).toBe(client);
    expect(instrumentPgClient(client)).toBe(client);
    await runTraceSpan('prepared request', async () => {
      await client.query({ name: 'find-user', text: 'SELECT * FROM users WHERE id = $1' }, [1]);
      await client.query({ name: 'find-user' }, [2]);
    });
    await provider.forceFlush();
    expect(querySpans()).toHaveLength(2);
    expect(querySpans().map((span) => span.attributes['db.tables'])).toEqual([['users'], ['users']]);
    expect(client.calls[1].config).toEqual({ name: 'find-user' });
  });

  it('keeps queued pool queries attached to their own request with a single connection', async () => {
    const pool = new Pool({ Client: FakeClient, max: 1, idleTimeoutMillis: 0 } as unknown as PoolConfig);
    expect(instrumentPgPool(pool)).toBe(pool);
    expect(instrumentPgPool(pool)).toBe(pool);
    try {
      await Promise.all([runTraceSpan('request A', async () => pool.query('SELECT * FROM users')), runTraceSpan('request B', async () => pool.query('SELECT * FROM pets'))]);
      await provider.forceFlush();
      const roots = finishedSpans().filter((span) => span.name.startsWith('request '));
      const queries = querySpans();
      expect(queries).toHaveLength(2);
      for (const [request, table] of [
        ['request A', 'users'],
        ['request B', 'pets'],
      ]) {
        const parent = roots.find((span) => span.name === request)!;
        const child = queries.find((span) => (span.attributes['db.tables'] as string[]).includes(table))!;
        expect(child.parentSpanId).toBe(parent.spanId);
        expect(child.traceId).toBe(parent.traceId);
      }
    } finally {
      await pool.end();
    }
  });

  it('instruments checked-out clients and transaction queries without duplicate spans', async () => {
    const pool = instrumentPgPool(new Pool({ Client: FakeClient, max: 1, idleTimeoutMillis: 0 } as unknown as PoolConfig));
    try {
      await runTraceSpan('transaction request', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('UPDATE users SET name = $1 WHERE id = $2', ['Updated', 1]);
          await client.query('SAVEPOINT example');
          await client.query('SELECT * FROM pets');
          await client.query('ROLLBACK TO SAVEPOINT example');
          await client.query('COMMIT');
        } finally {
          client.release();
        }
      });
      await provider.forceFlush();
      const queries = querySpans();
      expect(queries.filter((span) => (span.attributes['db.tables'] as string[]).includes('users'))).toHaveLength(1);
      expect(queries.filter((span) => (span.attributes['db.tables'] as string[]).includes('pets'))).toHaveLength(1);
      const parent = finishedSpans().find((span) => span.name === 'transaction request')!;
      expect(queries.every((span) => span.parentSpanId === parent.spanId)).toBe(true);
    } finally {
      await pool.end();
    }
  });
});

interface FakeQueryConfig {
  text?: string;
  name?: string;
  callback?: FakeQueryCallback;
}

interface FakeQueryResult {
  rows: Array<{ id: number }>;
  rowCount: number;
  command: string;
  fields: unknown[];
}

type FakeQueryCallback = (error: Error | null, result?: FakeQueryResult) => void;

class FakeClient extends EventEmitter {
  readonly result: FakeQueryResult = { rows: [{ id: 7 }], rowCount: 1, command: 'SELECT', fields: [] };
  readonly failure = new Error('database query failed');
  readonly calls: Array<{ config: string | FakeQueryConfig; values: unknown[] | undefined; receiver: FakeClient }> = [];
  readonly _queryable = true;
  readonly _ending = false;

  connect(callback: () => void): void {
    setImmediate(callback);
  }

  query(config: string | FakeQueryConfig, values?: unknown[]): Promise<FakeQueryResult>;
  query(config: string | FakeQueryConfig, callback: FakeQueryCallback): void;
  query(config: string | FakeQueryConfig, values: unknown[], callback: FakeQueryCallback): void;
  query(config: string | FakeQueryConfig, values?: unknown[] | FakeQueryCallback, callback?: FakeQueryCallback): Promise<FakeQueryResult> | void {
    this.calls.push({ config, values: Array.isArray(values) ? values : undefined, receiver: this });
    const text = typeof config === 'string' ? config : config.text;
    if (text?.includes('throw_sync')) throw this.failure;
    const done = typeof values === 'function' ? values : (callback ?? (typeof config === 'object' ? config.callback : undefined));
    if (done) {
      setImmediate(() => done(text?.includes('fail_async') ? this.failure : null, this.result));
      return;
    }
    return new Promise((resolve, reject) => {
      setImmediate(() => (text?.includes('fail_async') ? reject(this.failure) : resolve(this.result)));
    });
  }

  end(callback?: () => void): void {
    callback?.();
  }
}
