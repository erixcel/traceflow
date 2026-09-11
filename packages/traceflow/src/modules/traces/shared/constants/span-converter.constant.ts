import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../settings/constants';
import type { TraceFlowNodeType } from '../types/protocol.type';

export const TRACEFLOW_NODE_TYPES: ReadonlySet<TraceFlowNodeType> = new Set(['controller', 'service', 'method', 'table', 'validation', 'transformation', 'external-api', 'http', 'custom']);

export const TRACEFLOW_RESERVED_ATTRIBUTES: ReadonlySet<string> = new Set([...Object.values(TRACEFLOW_ATTRIBUTE_KEYS), ...Object.values(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS)]);
