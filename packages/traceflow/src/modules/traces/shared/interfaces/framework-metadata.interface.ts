/** Optional reflection support; no runtime dependency on Nest or reflect-metadata. */
export interface MetadataReflection {
  getMetadata?: (key: string, target: object, propertyKey?: string | symbol) => unknown;
  getMetadataKeys?: (target: object, propertyKey?: string | symbol) => string[];
  defineMetadata?: (key: string, value: unknown, target: object, propertyKey?: string | symbol) => void;
}
