// shared/error/errorCopy.ts
import type { AppError } from './types';

export function friendlyMessage(e: AppError) {
  if (e.category === 'network')    return 'Network error – check your connection and try again.';
  if (e.category === 'rate_limit') return 'You’re doing that too often. Please wait a moment and try again.';
  if (e.category === 'auth')       return 'Please sign in to continue.';
  if (e.category === 'not_found')  return 'We couldn’t find what you were looking for.';
  if (e.category === 'server')     return 'The server encountered a problem.';

  switch (e.httpStatus) {
    case 400: return 'There’s a problem with your request.';
    case 401: return 'Please sign in to continue.';
    case 403: return 'You don’t have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    default:
      if ((e.httpStatus ?? 0) >= 500) return 'The server encountered a problem.';
      return e.message || 'Something went wrong.';
  }
}
