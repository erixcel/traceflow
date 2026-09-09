import { astVisitor, parse } from 'pgsql-ast-parser';
import type { Statement } from 'pgsql-ast-parser';
import { PG_CONTROL_OPERATIONS, PG_QUERY_CACHE_LIMIT, PG_QUERY_PARSE_LIMIT } from '../constants/pg-instrumentation.constant';
import type { PgQueryMetadata } from '../interfaces/pg-instrumentation.interface';
import { pgQueryMetadataCache } from '../pg-instrumentation.runtime';

export function getPgQueryMetadata(sql: string): PgQueryMetadata {
  const cached = pgQueryMetadataCache.get(sql);
  if (cached) return cached;
  const unavailable: PgQueryMetadata = { tables: [], operation: 'QUERY', status: 'unavailable', control: false };
  if (sql.length > PG_QUERY_PARSE_LIMIT) return unavailable;
  let metadata = unavailable;
  try {
    const statements = parse(sql);
    const tables = new Set<string>();
    let ctes = new Set<string>();
    const visitor = astVisitor((map) => ({
      tableRef: (table) => {
        if (table.schema || !ctes.has(table.name)) tables.add(table.schema ? `${table.schema}.${table.name}` : table.name);
      },
      with: (statement) => {
        const parent = ctes;
        ctes = new Set(parent);
        for (const binding of statement.bind) {
          map.statement(binding.statement);
          ctes.add(binding.alias.name);
        }
        map.statement(statement.in);
        ctes = parent;
      },
      withRecursive: (statement) => {
        const parent = ctes;
        ctes = new Set([...parent, statement.alias.name]);
        map.statement(statement.bind);
        map.statement(statement.in);
        ctes = parent;
      },
    }));
    for (const statement of statements) visitor.statement(statement);
    const operations = [...new Set(statements.map(getPgStatementOperation))];
    metadata = {
      tables: [...tables],
      operation: operations.length === 1 ? operations[0]! : 'BATCH',
      status: 'parsed',
      control: statements.length > 0 && statements.every((statement) => PG_CONTROL_OPERATIONS.has(statement.type)),
    };
  } catch {
    // SQL unsupported by the parser still executes and is traced with unknown tables.
  }
  if (pgQueryMetadataCache.size >= PG_QUERY_CACHE_LIMIT) pgQueryMetadataCache.delete(pgQueryMetadataCache.keys().next().value!);
  pgQueryMetadataCache.set(sql, metadata);
  return metadata;
}

function getPgStatementOperation(statement: Statement): string {
  if (statement.type === 'with' || statement.type === 'with recursive') return getPgStatementOperation(statement.in);
  if (statement.type === 'union' || statement.type === 'union all') return 'SELECT';
  return statement.type.toUpperCase();
}
