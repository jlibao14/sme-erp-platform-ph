import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Standardises successful responses to { success, message, data, meta } per
// docs/api-specification.md. Handlers may return raw data, { data, meta }, or an
// already-enveloped object (passed through untouched).
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'success' in payload) {
          return payload;
        }
        if (payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload) {
          const { data, meta } = payload as { data: unknown; meta: unknown };
          return { success: true, data, meta };
        }
        return { success: true, data: payload ?? null };
      }),
    );
  }
}
