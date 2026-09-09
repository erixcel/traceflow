import type { PgQueryMetadata } from './interfaces/pg-instrumentation.interface';

export const instrumentedPgPools = new WeakSet<object>();
export const instrumentedPgClients = new WeakSet<object>();
export const pgQueryMetadataCache = new Map<string, PgQueryMetadata>();
