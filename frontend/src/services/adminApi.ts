import type {
  AdminSession, AdminVehicle, AdminVehicleRow, CreateVehicleRequest, ImageIntent, ImageStatus, ProblemDetails,
  SettableStatus, VehiclePatch, VehiclePreview,
} from '../types/admin';

/** Same origin as the site: Vite proxies /api in development, production serves both together. */
const BASE = '/api/admin';

export class ApiError extends Error {
  readonly status: number; // 0 = the request never reached the server
  readonly code: string | null;
  readonly field: string | null;
  readonly correlationId: string | null;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, problem: ProblemDetails = {}) {
    super(problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.code = problem.code ?? null;
    this.field = problem.field ?? null;
    this.correlationId = problem.correlationId ?? null;
    // Model-binding errors (e.g. text in a number) arrive as `errors: { "$.mileageKm": [...] }`.
    this.fieldErrors = Object.fromEntries(Object.entries(problem.errors ?? {})
      .map(([key, messages]) => [normalizeField(key), messages[0] ?? '']));
  }
}

function normalizeField(key: string) {
  const name = key.replace(/^\$\.?/, '');
  return name.charAt(0).toLowerCase() + name.slice(1);
}

let unauthorizedHandler: (() => void) | null = null;
/** The session owner registers here; any 401 outside login means the cookie is gone. */
export function setUnauthorizedHandler(handler: (() => void) | null) { unauthorizedHandler = handler; }

async function readProblem(response: Response): Promise<ProblemDetails> {
  try { return await response.json() as ProblemDetails; } catch { return {}; }
}

async function request<T>(path: string, init: RequestInit & { headersExtra?: Record<string, string> } = {}, handle401 = true): Promise<T> {
  const { headersExtra, ...rest } = init;
  const headers: Record<string, string> = { Accept: 'application/json', ...headersExtra };
  if (rest.body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(BASE + path, { ...rest, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) {
    if (response.status === 401 && handle401) unauthorizedHandler?.();
    throw new ApiError(response.status, await readProblem(response));
  }
  if (response.status === 204 || response.headers.get('Content-Length') === '0') return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ authenticated: boolean }>('/auth/login', { method: 'POST', body: json({ email, password }) }, false),
  logout: () => request<void>('/auth/logout', { method: 'POST' }, false),
  /** Null when there is no valid session. */
  me: async (): Promise<AdminSession | null> => {
    try { return await request<AdminSession>('/auth/me', {}, false); } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  listVehicles: () => request<AdminVehicleRow[]>('/vehicles'),
  getVehicle: (id: string) => request<AdminVehicle>(`/vehicles/${id}`),
  createVehicle: (body: CreateVehicleRequest) => request<AdminVehicle>('/vehicles', { method: 'POST', body: json(body) }),
  updateVehicle: (id: string, patch: VehiclePatch) =>
    request<AdminVehicle>(`/vehicles/${id}`, { method: 'PATCH', body: json(patch) }),
  changeStatus: (id: string, status: SettableStatus) =>
    request<AdminVehicle>(`/vehicles/${id}/status`, { method: 'POST', body: json({ status }) }),
  archiveVehicle: (id: string) => request<void>(`/vehicles/${id}/archive`, { method: 'POST' }),
  previewVehicle: (id: string) => request<VehiclePreview>(`/vehicles/${id}/preview`),

  imageIntent: (vehicleId: string, file: File) => request<ImageIntent>(`/vehicles/${vehicleId}/images/intent`, {
    method: 'POST', body: json({ mimeType: file.type, sizeBytes: file.size }), headersExtra: { 'Idempotency-Key': crypto.randomUUID() },
  }),
  completeImage: (vehicleId: string, imageId: string) => request<{ imageId: string; state: string }>(
    `/vehicles/${vehicleId}/images/${imageId}/complete`, { method: 'POST', headersExtra: { 'Idempotency-Key': crypto.randomUUID() } }),
  imageStatus: (vehicleId: string, imageId: string) => request<ImageStatus>(`/vehicles/${vehicleId}/images/${imageId}/status`),
  setCover: (vehicleId: string, imageId: string) => request<unknown>(`/vehicles/${vehicleId}/images/${imageId}/cover`, { method: 'POST' }),
  removeImage: (vehicleId: string, imageId: string) => request<void>(`/vehicles/${vehicleId}/images/${imageId}/remove`, { method: 'POST' }),
  reorderImages: (vehicleId: string, imageIds: string[]) =>
    request<void>(`/vehicles/${vehicleId}/images/reorder`, { method: 'POST', body: json({ imageIds }) }),
};

/**
 * PUT of the original file. XHR instead of fetch because fetch cannot report upload progress.
 * Local storage returns a same-origin /api path (cookie + Origin); S3 returns a presigned absolute URL (no cookie).
 */
export function uploadImage(uploadUrl: string, file: File, onProgress: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.withCredentials = uploadUrl.startsWith('/');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
      let problem: ProblemDetails = {};
      try { problem = JSON.parse(xhr.responseText) as ProblemDetails; } catch { /* S3 answers in XML */ }
      if (xhr.status === 401) unauthorizedHandler?.();
      reject(new ApiError(xhr.status, problem));
    };
    xhr.onerror = () => reject(new ApiError(0));
    xhr.send(file);
  });
}
