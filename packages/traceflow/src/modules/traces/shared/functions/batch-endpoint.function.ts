export function buildBatchEndpoint(studioUrl: string): string {
  const base = studioUrl.endsWith('/') ? studioUrl : `${studioUrl}/`;
  return new URL('api/v1/spans/batch', base).toString();
}
