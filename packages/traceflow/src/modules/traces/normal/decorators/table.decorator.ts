import type { TraceNodeOptions, TraceTableOptions } from '../../../settings/interfaces/traceflow-options.interface';
import type { TraceableMethod } from '../../shared/types/traceable-method.type';
import { TRACEFLOW_TRACED_METHOD } from '../constants/trace-decorator.constant';
import { Trace } from './trace.decorator';

/** Instrumenta automáticamente todos los métodos propios de una clase que representa una tabla. */
export function Table(options: TraceTableOptions): ClassDecorator {
  const tableName = options.name.trim();
  if (!tableName) throw new TypeError('@Table requiere un nombre de tabla');

  return (target: TraceableClass): void => {
    const { name: _name, system, exclude = [], labels = [], attributes, ...sharedOptions } = options;
    const databaseSystem = system?.trim();
    const prototype = target.prototype as object;

    for (const propertyKey of Reflect.ownKeys(prototype)) {
      if (propertyKey === 'constructor' || exclude.includes(propertyKey)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyKey);
      const method = descriptor?.value as TracedTableMethod | undefined;
      if (!descriptor || typeof method !== 'function' || method[TRACEFLOW_TRACED_METHOD]) continue;

      const traceOptions: TraceNodeOptions = {
        ...sharedOptions,
        name: tableName,
        type: 'table',
        labels: [...labels, 'table', inferTableOperation(String(propertyKey))],
        attributes: {
          ...attributes,
          'db.collection.name': tableName,
          ...(databaseSystem ? { 'db.system': databaseSystem } : {}),
        },
      };
      const tracedDescriptor = Trace(traceOptions)(prototype, propertyKey, descriptor) ?? descriptor;
      Object.defineProperty(prototype, propertyKey, tracedDescriptor);
    }
  };
}

function inferTableOperation(methodName: string): string {
  const normalized = methodName.toLocaleLowerCase();
  if (/^(create|add|insert)/.test(normalized)) return 'insert';
  if (/^(update|edit|set|upsert|restore)/.test(normalized)) return 'update';
  if (/^(delete|remove|destroy)/.test(normalized)) return 'delete';
  if (/^(count|sum|aggregate|summary|getsummary)/.test(normalized)) return 'aggregate';
  if (/^(find|get|list|search|select|read|exists|has)/.test(normalized)) return 'select';
  return 'query';
}

type TracedTableMethod = TraceableMethod & { [TRACEFLOW_TRACED_METHOD]?: boolean };
type TraceableClass = { prototype: object };
