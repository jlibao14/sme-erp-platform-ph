import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Maps all errors to the standard error envelope from docs/api-specification.md:
// { success: false, message, errors? }.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        // class-validator returns message as string[]; surface it as field errors.
        if (Array.isArray(b.message)) {
          message = 'Validation failed';
          errors = (b.message as string[]).map((m) => ({ message: m }));
        } else {
          message = (b.message as string) ?? message;
        }
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
  }
}
