export interface TracePgOptions {
  /** Desactiva la instrumentación para esta conexión. */
  enabled?: boolean;
  /** SQL y parámetros son opt-in; siempre se capturan operación, tablas y cantidad de filas. */
  capture?: { statement?: boolean; parameters?: boolean };
}

export interface PgQueryMetadata {
  tables: string[];
  operation: string;
  status: 'parsed' | 'unavailable';
  control: boolean;
}
