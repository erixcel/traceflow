import type { TraceFlowAttributes } from '../types/protocol.type';
import type { MetadataReflection } from '../interfaces/framework-metadata.interface';
import { NEST_REQUEST_METHODS } from '../constants/framework-metadata.constant';

export function copyMethodMetadata(source: object, target: object): void {
  const metadata = Reflect as MetadataReflection;
  for (const key of metadata.getMetadataKeys?.(source) ?? []) {
    metadata.defineMetadata?.(key, metadata.getMetadata?.(key, source), target);
  }
}

/** Reads declared controller routes at invocation time, after all decorators ran.
 * This is not the actual request URL: global prefixes and versioning are unknown.
 */
export function getControllerRouteAttributes(controller: object, method: object): TraceFlowAttributes {
  const metadata = Reflect as MetadataReflection;
  const requestMethod = metadata.getMetadata?.('method', method);
  if (typeof requestMethod !== 'number' || !NEST_REQUEST_METHODS[requestMethod]) {
    return {};
  }

  const controllerPaths = paths(metadata.getMetadata?.('path', controller));
  const methodPaths = paths(metadata.getMetadata?.('path', method));
  if (!controllerPaths.length || !methodPaths.length) {
    return {};
  }

  const routes = controllerPaths.flatMap((base) => methodPaths.map((path) => `/${[base, path].join('/').split('/').filter(Boolean).join('/')}`));
  return { 'http.request.method': NEST_REQUEST_METHODS[requestMethod]!, 'traceflow.controller.route': routes.length === 1 ? routes[0]! : routes };
}

function paths(value: unknown): string[] {
  return typeof value === 'string' ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
