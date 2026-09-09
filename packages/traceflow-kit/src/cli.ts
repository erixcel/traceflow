import { isErrorWithCode, parseStudioArgs, printUsage } from './functions/cli.function';
import { bootstrap } from './main';
import type { StudioCliOptions } from './types/cli.type';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (command === '--help' || command === '-h') {
    printUsage();
    return;
  }

  if (command !== 'studio') {
    console.error('Comando inválido. Usa: traceflow-kit studio');
    process.exitCode = 1;
    return;
  }

  let options: StudioCliOptions;
  try {
    options = parseStudioArgs(args);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const app = await bootstrap({ debug: options.debug });
  let closing = false;

  const close = async (): Promise<void> => {
    if (closing) {
      return;
    }
    closing = true;
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void close();
  });
  process.once('SIGTERM', () => {
    void close();
  });

  try {
    await app.listen(options.port, options.host);
  } catch (error: unknown) {
    if (isErrorWithCode(error, 'EADDRINUSE')) {
      console.error(`El puerto ${options.port} ya está ocupado. Usa --port para elegir otro.`);
    } else {
      console.error(`TraceFlow Studio no pudo iniciar: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exitCode = 1;
    return;
  }

  if (options.host === '0.0.0.0') {
    console.warn('Advertencia: Studio está expuesto en todas las interfaces de red.');
  }

  const browserHost = options.host === '0.0.0.0' ? '127.0.0.1' : options.host;
  const studioUrl = `http://${browserHost}:${options.port}`;
  console.info('TraceFlow Studio iniciado');
  console.info(`Studio: ${studioUrl}`);
  console.info(`Ingesta: ${studioUrl}/api/v1/spans/batch`);

  if (options.openBrowser) {
    try {
      const { default: open } = await import('open');
      await open(studioUrl);
    } catch (error: unknown) {
      if (options.debug) {
        console.warn(`No se pudo abrir el navegador: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

void main();
