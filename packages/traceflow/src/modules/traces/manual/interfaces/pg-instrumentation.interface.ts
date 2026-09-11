export interface TracePgCaptureOptions {
  /** Captura la sentencia SQL ejecutada. */
  statement?: boolean;
  /** Captura los parámetros pasados a la consulta en Entrada. */
  parameters?: boolean;
  /** Captura las filas y resultado devueltos por la consulta en Salida. */
  result?: boolean;
  /** Alias para `result`. */
  rows?: boolean;
}

export interface TracePgOptions {
  /** Desactiva la instrumentación para esta conexión. */
  enabled?: boolean;
  /** SQL, parámetros y resultados son opt-in; siempre se capturan operación, tablas y cantidad de filas. */
  capture?: boolean | TracePgCaptureOptions;
}

export interface PgQueryMetadata {
  tables: string[];
  operation: string;
  status: 'parsed' | 'unavailable';
  control: boolean;
}
