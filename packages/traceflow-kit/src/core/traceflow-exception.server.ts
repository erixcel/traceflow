import { ArgumentsHost, Catch, ExceptionFilter, HttpException, type INestApplication } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { createApiError } from '../functions/api-error.function';
import { isApiError, resolveStatusCode } from '../functions/exception.function';

export function setupTraceFlowException(app: INestApplication): void {
  app.useGlobalFilters(new TraceFlowExceptionFilter());
}

@Catch()
export class TraceFlowExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const statusCode = resolveStatusCode(exception);
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;

    const payload = isApiError(response)
      ? response
      : createApiError(
          statusCode,
          statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'STUDIO_INTERNAL_ERROR',
          statusCode === 413 ? 'El payload supera el límite permitido de 2 MB' : 'TraceFlow Studio no pudo procesar la solicitud',
        );

    reply.status(statusCode).send(payload);
  }
}
