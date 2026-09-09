/** Estados posibles de una traza o span. */
export type TraceFlowStatus = 'unset' | 'success' | 'error';

/** Categorías visuales y semánticas de un nodo trazado. */
export type TraceFlowNodeType = 'controller' | 'service' | 'method' | 'table' | 'validation' | 'transformation' | 'external-api' | 'custom';

/** Valores permitidos como atributos de un span. */
export type TraceFlowAttributeValue = string | number | boolean | string[] | number[] | boolean[];

export type TraceFlowAttributes = Record<string, TraceFlowAttributeValue>;

export type TraceFlowStoreEventType = 'trace.created' | 'trace.updated' | 'traces.cleared' | 'trace.deleted';
