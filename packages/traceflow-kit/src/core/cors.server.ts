import type { INestApplication } from '@nestjs/common';

export function setupCors(app: INestApplication): void {
  app.enableCors({
    origin: [/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  });
}
