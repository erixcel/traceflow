import type { StudioCliOptions } from '../types/cli.type';

export function parseStudioArgs(args: string[]): StudioCliOptions {
  let host = process.env.TRACEFLOW_STUDIO_HOST ?? '127.0.0.1';
  let port = parsePort(process.env.TRACEFLOW_STUDIO_PORT ?? '4789');
  let openBrowser = true;
  let debug = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--host') {
      host = requireValue(args, ++index, '--host');
    } else if (argument === '--port') {
      port = parsePort(requireValue(args, ++index, '--port'));
    } else if (argument === '--no-open') {
      openBrowser = false;
    } else if (argument === '--debug') {
      debug = true;
    } else if (argument === '--help' || argument === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Opción desconocida: ${argument}`);
    }
  }

  return { host, port, openBrowser, debug };
}

export function requireValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value) {
    throw new Error(`${option} requiere un valor`);
  }
  return value;
}

export function parsePort(value: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Puerto inválido: ${value}`);
  }
  return port;
}

export function isErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && (error as Error & { code?: string }).code === code;
}

export function printUsage(): void {
  console.info(`Uso:
  traceflow-kit studio [opciones]

Opciones:
  --host <host>    Host de escucha (127.0.0.1 por defecto)
  --port <puerto>  Puerto de escucha (4789 por defecto)
  --no-open        No abrir el navegador
  --debug          Mostrar logs de diagnóstico
  --help           Mostrar esta ayuda`);
}
