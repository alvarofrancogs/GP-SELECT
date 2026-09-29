import { adminCopy } from '../i18n/adminCopy';
import { ApiError } from '../services/adminApi';

const text = adminCopy.errors;

/** Human message for any failed admin request; raw codes and status numbers never reach the screen. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return text.unexpected;
  if (error.status === 0) return text.network;
  if (error.code && text.codes[error.code]) return text.codes[error.code];
  if (error.status === 403) return text.forbidden;
  if (error.status === 404) return text.notFound;
  if (error.status === 413) return adminCopy.photos.tooBig;
  if (error.status === 415) return adminCopy.photos.badType;
  if (error.status >= 500) return text.server;
  return text.unexpected;
}

/** Correlation id worth showing only when the failure needs a developer. */
export function errorReference(error: unknown): string | null {
  return error instanceof ApiError && (error.status >= 500 || error.status === 403) ? error.correlationId : null;
}

/** Errors that belong next to a field: the domain `field` plus model-binding errors. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result: Record<string, string> = {};
  for (const key of Object.keys(error.fieldErrors)) result[key] = text.number;
  if (error.field) result[error.field] = error.code && text.codes[error.code] ? text.codes[error.code] : text.unexpected;
  return result;
}
