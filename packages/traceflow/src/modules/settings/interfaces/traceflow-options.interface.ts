import type { TraceFlowAttributes, TraceFlowNodeType } from '../../traces/shared/types/protocol.type';
import type { TraceFlowDefinitionDto } from '../../traces/shared/interfaces/protocol.interface';

export interface TraceFlowOptions {
  serviceName: string;
  studioUrl?: string;
  enabled?: boolean;
  debug?: boolean;
  /** Instrumenta las entradas y salidas HTTP de Node.js sin un adapter de framework. */
  instrumentHttp?: boolean;
  requestTimeoutMs?: number;
  headers?: Record<string, string>;
  flows?: readonly TraceFlowDefinitionDto[];
}

export interface TraceCaptureOptions {
  /** Captura los argumentos del método. Está habilitado por defecto. */
  input?: boolean;
  /** Captura el valor devuelto por el método. Está habilitado por defecto. */
  output?: boolean;
}

export interface TraceNodeOptions {
  name?: string;
  /** Categoría visual del span. Usa `method` cuando se omite. */
  type?: TraceFlowNodeType;
  description?: string;
  attributes?: TraceFlowAttributes;
  labels?: readonly string[];
  capture?: TraceCaptureOptions;
}

/** Opciones para instrumentar como tabla todos los métodos propios de una clase. */
export interface TraceTableOptions extends Omit<TraceNodeOptions, 'name' | 'type'> {
  name: string;
  /** Sistema de base de datos, por ejemplo `postgresql`, `mysql` o `mongodb`. */
  system?: string;
  /** Métodos que deben permanecer sin instrumentar. */
  exclude?: readonly (string | symbol)[];
}

export interface ResolvedTraceFlowOptions {
  serviceName: string;
  studioUrl: string;
  enabled: boolean;
  debug: boolean;
  instrumentHttp: boolean;
  requestTimeoutMs: number;
  headers: Record<string, string>;
  flows: TraceFlowDefinitionDto[];
}
