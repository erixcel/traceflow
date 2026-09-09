import 'reflect-metadata';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStudioServer } from '../src/server';

describe('Studio static hosting during development', () => {
  it('serves the app and new asset hashes even when the frontend is built after startup', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'traceflow-static-test-'));
    const studioRoot = join(temp, 'studio-web');
    const app = await createStudioServer({ studioRoot });
    try {
      const server = app.getHttpAdapter().getInstance();
      await server.ready();
      await mkdir(join(studioRoot, 'assets'), { recursive: true });
      await writeFile(join(studioRoot, 'index.html'), '<html>TraceFlow test</html>');
      await writeFile(join(studioRoot, 'assets', 'app-new-hash.js'), 'export const ready = true;');
      const page = await server.inject({ method: 'GET', url: '/admin/flows' });
      expect(page.statusCode).toBe(200);
      expect(page.headers['content-type']).toContain('text/html');
      expect(page.body).toContain('TraceFlow test');
      expect((await server.inject({ method: 'GET', url: '/assets/app-new-hash.js' })).statusCode).toBe(200);
      await writeFile(join(studioRoot, 'assets', 'app-next-build.js'), 'export const ready = true;');
      expect((await server.inject({ method: 'GET', url: '/assets/app-next-build.js' })).statusCode).toBe(200);
      expect((await server.inject({ method: 'GET', url: '/api/v1/traces' })).statusCode).toBe(200);
      expect((await server.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    } finally {
      await app.close();
      await rm(temp, { recursive: true, force: true });
    }
  });
});
