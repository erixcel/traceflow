export const PG_QUERY_CACHE_LIMIT = 256;
export const PG_QUERY_PARSE_LIMIT = 65_536;
export const PG_CONTROL_OPERATIONS: ReadonlySet<string> = new Set(['begin', 'start transaction', 'commit', 'rollback', 'savepoint', 'release', 'set']);
