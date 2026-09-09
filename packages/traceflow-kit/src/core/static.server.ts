import fastifyStatic from '@fastify/static';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { StudioServerOptions } from '../types/server.type';

export function setupStudioStatic(app: NestFastifyApplication, options: StudioServerOptions): void {
  if (options.serveStudio === false) {
    return;
  }

  const studioRoot = options.studioRoot ?? resolve(__dirname, '../studio-web');
  const server = app.getHttpAdapter().getInstance();
  server.register(fastifyStatic, {
    root: studioRoot,
    prefix: '/',
    // Resolve files per request: Vite changes asset hashes on every build, and
    // the development watcher can start while studio-web is being rebuilt.
    wildcard: true,
  });
  server.get('/admin', (_request, reply) => reply.type('text/html').send(createReadStream(join(studioRoot, 'index.html'))));
  server.get('/admin/*', (_request, reply) => reply.type('text/html').send(createReadStream(join(studioRoot, 'index.html'))));
}
