/** Optional reflection support; no runtime dependency on Nest or reflect-metadata. */
export interface MetadataReflection {
  getMetadata?: (key: string, target: object) => unknown;
  getMetadataKeys?: (target: object) => string[];
  defineMetadata?: (key: string, value: unknown, target: object) => void;
}
