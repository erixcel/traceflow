import { createStudioServer } from './server';
import type { StudioServerOptions } from './types/server.type';

export async function bootstrap(options: StudioServerOptions = {}) {
  return createStudioServer(options);
}
