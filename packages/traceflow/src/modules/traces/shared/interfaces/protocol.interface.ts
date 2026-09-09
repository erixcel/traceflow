import type { TRACEFLOW_PROTOCOL_VERSION } from '../../../settings/constants/protocol.constant';
import type { JsonValue } from '../types/json.type';
import type { TraceFlowAttributes, TraceFlowNodeType, TraceFlowStatus, TraceFlowStoreEventType } from '../types/protocol.type';

/**
 * Categoría visual y semántica de un nodo de TraceFlow.
 *
 * - `controller`: endpoint HTTP que recibe una solicitud y devuelve una respuesta.
 * - `service`: caso de uso o servicio que coordina la lógica de negocio.
 * - `method`: método interno relevante que forma parte del recorrido.
 * - `table`: acceso a una tabla o colección de datos.
 * - `validation`: validación de DTOs, entradas, permisos o reglas de negocio.
 * - `transformation`: conversión, normalización o mapeo de datos.
 * - `external-api`: llamada HTTP o RPC hacia otro servicio o proveedor.
 * - `custom`: caché, archivos, cifrado u otra operación personalizada.
 */
export interface TraceFlowErrorDto {
  name: string;
  message: string;
  stack?: string;
}

export interface TraceFlowSpanDto {
  protocolVersion: typeof TRACEFLOW_PROTOCOL_VERSION;
  serviceName: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  type: TraceFlowNodeType;
  labels: string[];
  className: string | null;
  methodName: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: TraceFlowStatus;
  input?: JsonValue;
  output?: JsonValue;
  attributes: TraceFlowAttributes;
  error: TraceFlowErrorDto | null;
}

/**
 * Nodo que forma parte del recorrido esperado de un flujo.
 *
 * `className` y `methodName` permiten relacionar esta definición con el span
 * que produce `@TraceNode` cuando el método realmente se ejecuta.
 */
export interface TraceFlowNodeDefinitionDto {
  id: string;
  name: string;
  type: TraceFlowNodeType;
  className: string;
  methodName: string;
  description?: string;
}

/**
 * Conexión dirigida entre dos nodos del recorrido esperado.
 *
 * `parallel` solo cambia la representación de la línea; los estados se
 * calculan a partir de la ejecución real de cada nodo.
 */
export interface TraceFlowEdgeDefinitionDto {
  source: string;
  target: string;
  parallel?: boolean;
}

/**
 * Mapa completo de un caso de uso, incluidos los pasos que podrían no llegar
 * a ejecutarse debido a un error anterior.
 */
export interface TraceFlowDefinitionDto {
  id: string;
  name: string;
  rootNodeId: string;
  nodes: TraceFlowNodeDefinitionDto[];
  edges: TraceFlowEdgeDefinitionDto[];
}

export interface TraceFlowSpanBatchDto {
  protocolVersion: typeof TRACEFLOW_PROTOCOL_VERSION;
  sdkName: string;
  sdkVersion: string;
  sentAt: string;
  spans: TraceFlowSpanDto[];
  flows?: TraceFlowDefinitionDto[];
}

export interface TraceFlowTraceSummaryDto {
  traceId: string;
  serviceName: string;
  rootName: string;
  startedAt: string;
  updatedAt: string;
  durationMs: number;
  status: TraceFlowStatus;
  isComplete: boolean;
  spanCount: number;
}

export interface TraceFlowTraceDto extends TraceFlowTraceSummaryDto {
  spans: TraceFlowSpanDto[];
  flow: TraceFlowDefinitionDto | null;
}

export interface TraceFlowHealthDto {
  status: 'ok';
  service: 'traceflow-studio';
  protocolVersion: typeof TRACEFLOW_PROTOCOL_VERSION;
}

export interface TraceFlowIngestResultDto {
  accepted: number;
  traceIds: string[];
}

export interface TraceFlowApiErrorDto {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
}

export interface TraceFlowStoreEvent {
  type: TraceFlowStoreEventType;
  traceId?: string;
  occurredAt: string;
}
