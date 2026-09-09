import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { TRACEFLOW_MAX_BODY_BYTES } from 'traceflow/protocol';
import { AppModule } from './app.module';
import { setupCors } from './core/cors.server';
import { setupStudioStatic } from './core/static.server';
import { setupSwagger } from './core/swagger.server';
import { setupTraceFlowException } from './core/traceflow-exception.server';
import { setupValidation } from './core/validation.server';
import type { StudioServerOptions } from './types/server.type';

export async function createStudioServer(options: StudioServerOptions = {}): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    bodyLimit: TRACEFLOW_MAX_BODY_BYTES,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(options.store), adapter, {
    logger: options.debug ? ['log', 'warn', 'error'] : ['warn', 'error'],
  });

  setupCors(app);
  setupValidation(app);
  setupTraceFlowException(app);
  setupStudioStatic(app, options);
  setupSwagger(app);

  await app.init();

  return app;
}
