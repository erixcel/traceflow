import { TRACEFLOW_PROTOCOL_VERSION } from 'traceflow/protocol';
import { z } from 'zod';

const traceIdSchema = z.string().regex(/^[0-9a-f]{32}$/i, 'traceId debe contener 32 caracteres hexadecimales');
const spanIdSchema = z.string().regex(/^[0-9a-f]{16}$/i, 'spanId debe contener 16 caracteres hexadecimales');
const dateSchema = z.string().datetime({ offset: true });
const attributeValueSchema = z.union([
  z.string().max(4_096),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(4_096)).max(200),
  z.array(z.number().finite()).max(200),
  z.array(z.boolean()).max(200),
]);
const nodeTypeSchema = z.enum(['controller', 'service', 'method', 'table', 'validation', 'transformation', 'external-api', 'custom']);
const flowIdSchema = z.string().trim().min(1).max(200);
const flowSchema = z
  .object({
    id: flowIdSchema,
    name: z.string().trim().min(1).max(500),
    rootNodeId: flowIdSchema,
    nodes: z
      .array(
        z
          .object({
            id: flowIdSchema,
            name: z.string().trim().min(1).max(500),
            type: nodeTypeSchema,
            className: z.string().trim().min(1).max(300),
            methodName: z.string().trim().min(1).max(300),
            description: z.string().max(2_000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(500),
    edges: z
      .array(
        z
          .object({
            source: flowIdSchema,
            target: flowIdSchema,
            parallel: z.boolean().optional(),
          })
          .strict(),
      )
      .max(1_000),
  })
  .strict()
  .superRefine((flow, context) => {
    const nodeIds = new Set(flow.nodes.map((node) => node.id));

    if (nodeIds.size !== flow.nodes.length) {
      context.addIssue({
        code: 'custom',
        message: `El flujo "${flow.id}" contiene IDs de nodo duplicados`,
        path: ['nodes'],
      });
    }

    if (!nodeIds.has(flow.rootNodeId)) {
      context.addIssue({
        code: 'custom',
        message: `El rootNodeId de "${flow.id}" no existe en nodes`,
        path: ['rootNodeId'],
      });
    }

    flow.edges.forEach((edge, index) => {
      if (!nodeIds.has(edge.source)) {
        context.addIssue({
          code: 'custom',
          message: `El source "${edge.source}" no existe en el flujo`,
          path: ['edges', index, 'source'],
        });
      }
      if (!nodeIds.has(edge.target)) {
        context.addIssue({
          code: 'custom',
          message: `El target "${edge.target}" no existe en el flujo`,
          path: ['edges', index, 'target'],
        });
      }
    });
  });

export const spanBatchSchema = z
  .object({
    protocolVersion: z.literal(TRACEFLOW_PROTOCOL_VERSION),
    sdkName: z.string().min(1).max(200),
    sdkVersion: z.string().min(1).max(100),
    sentAt: dateSchema,
    spans: z
      .array(
        z
          .object({
            protocolVersion: z.literal(TRACEFLOW_PROTOCOL_VERSION),
            serviceName: z.string().min(1).max(200),
            traceId: traceIdSchema,
            spanId: spanIdSchema,
            parentSpanId: spanIdSchema.nullable(),
            name: z.string().min(1).max(500),
            type: nodeTypeSchema,
            labels: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
            className: z.string().max(300).nullable(),
            methodName: z.string().max(300).nullable(),
            description: z.string().max(2_000).nullable(),
            startedAt: dateSchema,
            endedAt: dateSchema,
            durationMs: z.number().finite().nonnegative(),
            status: z.enum(['unset', 'success', 'error']),
            input: z.json().optional(),
            output: z.json().optional(),
            attributes: z.record(z.string().max(300), attributeValueSchema),
            error: z
              .object({
                name: z.string().min(1).max(300),
                message: z.string().min(1).max(8_000),
                stack: z.string().max(32_000).optional(),
              })
              .strict()
              .nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(1_000),
    flows: z.array(flowSchema).max(50).optional(),
  })
  .strict();

export type SpanBatch = z.infer<typeof spanBatchSchema>;
