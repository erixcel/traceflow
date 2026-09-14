import { runTraceSpan } from '../../shared/functions/trace-span.function';
import { getMethodParameterNames, mapMethodArguments } from '../../shared/functions/method-argument.function';
import type { TraceNodeOptions } from '../../../settings/interfaces/traceflow-options.interface';
import type { TraceableMethod } from '../../shared/types/traceable-method.type';
import type { TraceFlowNodeType } from '../../shared/types/protocol.type';
import type { MetadataReflection } from '../../shared/interfaces/framework-metadata.interface';
import { copyMethodMetadata, getControllerRouteAttributes } from '../../shared/functions/framework-metadata.function';
import { extractValidationContract, getValidationSchemaAttributes, registerTracedDto } from '../../shared/functions/validation-schema.function';
import { TRACEFLOW_ATTRIBUTE_KEYS } from '../../../settings/constants/protocol.constant';
import { TRACEFLOW_TRACED_CLASS, TRACEFLOW_TRACED_METHOD } from '../constants/trace-decorator.constant';

type ClassTarget = object & { prototype?: object };
type DecoratorTarget = object | (abstract new (...args: unknown[]) => unknown);

function decorateClass(target: ClassTarget, options: TraceNodeOptions): void {
  Object.defineProperty(target, TRACEFLOW_TRACED_CLASS, { value: true, configurable: true });
  const metadata = Reflect as MetadataReflection;
  metadata.defineMetadata?.(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, options.type ?? 'validation', target);
  if (options.name) {
    metadata.defineMetadata?.('traceflow:node_name', options.name, target);
  }
  if (options.description) {
    metadata.defineMetadata?.(TRACEFLOW_ATTRIBUTE_KEYS.nodeDescription, options.description, target);
  }
  const contract = extractValidationContract(target);
  if (contract) {
    metadata.defineMetadata?.('traceflow.validation.schema', JSON.stringify(contract), target);
  }
  registerTracedDto(target, contract);
}

function decorateMethod(target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor, options: TraceNodeOptions): PropertyDescriptor {
  const originalMethod = descriptor.value as TraceableMethod;

  if (typeof originalMethod !== 'function') {
    throw new TypeError('@Trace solo puede utilizarse en clases o métodos');
  }

  const parameterNames = getMethodParameterNames(originalMethod);
  const declaringClass = typeof target === 'function' ? target : target.constructor;

  const tracedMethod = function (this: object | undefined, ...args: unknown[]): unknown {
    const runtimeClass = typeof this === 'function' ? this : this?.constructor;
    const className = runtimeClass?.name ?? declaringClass.name;
    const methodName = String(propertyKey);
    const spanName = options.name ?? `${className}.${methodName}`;
    const input = mapMethodArguments(parameterNames, args);

    return runTraceSpan(
      spanName,
      () => originalMethod.apply(this, args),
      {
        ...options,
        attributes: {
          ...(options.type === 'controller' ? getControllerRouteAttributes(runtimeClass ?? declaringClass, tracedMethod) : {}),
          ...getValidationSchemaAttributes(runtimeClass ?? declaringClass, tracedMethod, args, options.dto),
          ...options.attributes,
        },
        className,
        methodName,
      },
      input,
    );
  };

  // Preserve the method name so framework metadata and error reports remain
  // readable after the method is wrapped.
  Object.defineProperty(tracedMethod, 'name', {
    configurable: true,
    value: originalMethod.name,
  });
  Object.defineProperty(tracedMethod, TRACEFLOW_TRACED_METHOD, { value: true });

  copyMethodMetadata(originalMethod, tracedMethod);

  descriptor.value = tracedMethod;

  return descriptor;
}

export function Trace(optionsOrType: TraceNodeOptions | TraceFlowNodeType = {}): MethodDecorator & ClassDecorator {
  const options: TraceNodeOptions = typeof optionsOrType === 'string' ? { type: optionsOrType } : optionsOrType;

  return ((target: DecoratorTarget, propertyKey?: string | symbol, descriptor?: PropertyDescriptor): unknown => {
    if (propertyKey !== undefined && descriptor !== undefined) {
      return decorateMethod(target as object, propertyKey, descriptor, options);
    }
    if (typeof target === 'function') {
      decorateClass(target as unknown as ClassTarget, options);
      return target;
    }
    throw new TypeError('@Trace solo puede utilizarse en clases o métodos');
  }) as MethodDecorator & ClassDecorator;
}

/** Alias histórico conservado para no romper las aplicaciones existentes. */
export function TraceNode(optionsOrType: TraceNodeOptions | TraceFlowNodeType = {}): MethodDecorator & ClassDecorator {
  return Trace(optionsOrType);
}
