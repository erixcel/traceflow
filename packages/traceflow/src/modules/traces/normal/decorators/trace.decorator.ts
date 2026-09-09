import { runTraceSpan } from '../../shared/functions/trace-span.function';
import { getMethodParameterNames, mapMethodArguments } from '../../shared/functions/method-argument.function';
import type { TraceNodeOptions } from '../../../settings/interfaces/traceflow-options.interface';
import type { TraceableMethod } from '../../shared/types/traceable-method.type';
import { copyMethodMetadata, getControllerRouteAttributes } from '../../shared/functions/framework-metadata.function';
import { TRACEFLOW_TRACED_METHOD } from '../constants/trace-decorator.constant';

export function Trace(options: TraceNodeOptions = {}): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
    const originalMethod = descriptor.value as TraceableMethod;

    if (typeof originalMethod !== 'function') {
      throw new TypeError('@Trace solo puede utilizarse en métodos');
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
          attributes: { ...(options.type === 'controller' ? getControllerRouteAttributes(runtimeClass ?? declaringClass, tracedMethod) : {}), ...options.attributes },
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
  };
}

/** Alias histórico conservado para no romper las aplicaciones existentes. */
export function TraceNode(options: TraceNodeOptions = {}): MethodDecorator {
  return Trace(options);
}
