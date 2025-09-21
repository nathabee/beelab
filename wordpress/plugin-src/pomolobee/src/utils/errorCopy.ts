// src/utils/errorCopy.ts
import type { AppError } from '@mytypes/error';

export function friendlyMessage(e: AppError) {
  switch (e.httpStatus) {
    case 401: return 'Please sign in to continue.';
    case 403: return 'You don’t have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    default:
      if ((e.httpStatus ?? 0) >= 500) return 'The server encountered a problem.';
      return e.message;
  }
}
