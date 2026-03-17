/**
 * Centralized API client used by the Next.js frontend.
 *
 * This module intentionally targets the frontend "same-origin" Next.js routes under `/api/**`,
 * which are implemented by Next.js route handlers in `src/app/api/**`.
 *
 * Those route handlers can proxy to the Express backend or implement lightweight behavior.
 * This keeps the browser client simple and avoids hard-coding backend origins.
 */

export type UUID = string;

export interface BuildStatus {
  id: UUID;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  message: string | null;
  currentStep: string | null;
  updatedAt: string;
}

/**
 * Error thrown when an API request returns a non-2xx status.
 */
export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, params: { status: number; payload: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = params.status;
    this.payload = params.payload;
  }
}

type ApiFetchInit = RequestInit & {
  /**
   * If true, do not throw ApiError on non-2xx responses; instead return the parsed payload.
   * Default: false (throw on non-2xx).
   */
  noThrow?: boolean;
};

function resolveBaseUrl(): string {
  /**
   * Prefer Next.js same-origin API routes by default (baseUrl="").
   * If the app is configured to call a full external origin from the browser, allow it via env vars.
   *
   * Environment variables available in this container include:
   * - NEXT_PUBLIC_API_BASE
   * - NEXT_PUBLIC_BACKEND_URL
   *
   * We do not assume their values; we just use them if present.
   */
  const fromApiBase = (process.env.NEXT_PUBLIC_API_BASE ?? '').trim();
  if (fromApiBase) return fromApiBase.replace(/\/+$/, '');

  const fromBackend = (process.env.NEXT_PUBLIC_BACKEND_URL ?? '').trim();
  if (fromBackend) return fromBackend.replace(/\/+$/, '');

  return '';
}

async function safeParseJson(res: Response): Promise<unknown> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    return text;
  }
  return res.json().catch(async () => {
    const text = await res.text().catch(() => '');
    return text;
  });
}

// PUBLIC_INTERFACE
export async function apiFetch<T = any>(path: string, init: ApiFetchInit = {}): Promise<T> {
  /**
   * Fetch helper that:
   * - prefixes URL with env base (optional)
   * - sets JSON headers by default for JSON bodies
   * - parses JSON responses
   * - throws ApiError on non-2xx unless init.noThrow is true
   */
  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(init.headers);

  // If sending a plain object body, default to JSON.
  const hasBody = init.body !== undefined && init.body !== null;
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const payload = await safeParseJson(res);

  if (!res.ok && !init.noThrow) {
    const message =
      (payload && typeof payload === 'object' && 'message' in (payload as any) && typeof (payload as any).message === 'string'
        ? (payload as any).message
        : `Request failed: ${res.status} ${res.statusText}`) || `Request failed: ${res.status}`;
    throw new ApiError(message, { status: res.status, payload });
  }

  return payload as T;
}

/**
 * --- High-level API helpers used by the app ---
 * These functions follow the backend-ish naming used in the UI components,
 * but they call the Next.js API routes under `/api/**`.
 */

export interface OrchestrationRunAllRequest {
  mode?: 'persona_build' | 'workflow';
  userId?: UUID | null;
  personaId?: UUID | null;
  documentIds?: UUID[];
  useLatestCategoryDocs?: boolean | null;
  autoCreatePersona?: boolean | null;
  extract?: {
    documentIds?: UUID[];
    normalize?: {
      removeExtraWhitespace?: boolean | null;
      normalizeLineBreaks?: boolean | null;
      maxLength?: number | null;
    };
    persistToDocuments?: boolean | null;
  };
  generate?: {
    sourceTextOverride?: string;
    context?: {
      targetRole?: string | null;
      seniority?: string | null;
      industry?: string | null;
    } | null;
    personaId?: UUID;
    saveDraft?: boolean | null;
    createVersion?: boolean | null;
  };
  finalize?: {
    finalOverride?: Record<string, any>;
    personaId?: UUID;
    saveFinal?: boolean | null;
    createVersion?: boolean | null;
  };
}

export interface OrchestrationRunAllResponse {
  build: {
    id: UUID;
    status: BuildStatus['status'];
    progress: number;
    message?: string | null;
    currentStep?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  orchestration: any;
  results: any;
}

// PUBLIC_INTERFACE
export async function orchestrationRunAll(req: OrchestrationRunAllRequest): Promise<OrchestrationRunAllResponse> {
  /** Runs the backend orchestration workflow end-to-end via POST /api/orchestration/run-all. */
  return apiFetch<OrchestrationRunAllResponse>('/api/orchestration/run-all', {
    method: 'POST',
    body: JSON.stringify(req ?? {}),
  });
}

// PUBLIC_INTERFACE
export async function getBuildStatus(buildId: UUID): Promise<BuildStatus> {
  /** Polls build status/progress via GET /api/builds/{id}/status. */
  return apiFetch<BuildStatus>(`/api/builds/${encodeURIComponent(buildId)}/status`, {
    method: 'GET',
    cache: 'no-store',
  });
}

// PUBLIC_INTERFACE
export async function generateDraftForBuild(params: {
  buildId: UUID;
  personaId?: UUID;
  saveDraft?: boolean;
  createVersion?: boolean;
}): Promise<{ requestId?: UUID; personaId?: UUID | null; persona?: unknown; buildId?: UUID } & Record<string, any>> {
  /** Generates a draft persona for an existing build via POST /api/orchestration/builds/{id}/generate-draft. */
  const { buildId, ...body } = params;
  return apiFetch(`/api/orchestration/builds/${encodeURIComponent(buildId)}/generate-draft`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// PUBLIC_INTERFACE
export async function finalizePersonaForBuild(params: {
  buildId: UUID;
  personaId?: UUID;
  finalOverride?: Record<string, any>;
  saveFinal?: boolean;
  createVersion?: boolean;
}): Promise<{ buildId: UUID; personaId?: UUID | null; final?: unknown } & Record<string, any>> {
  /** Finalizes persona for an existing build via POST /api/orchestration/builds/{id}/finalize. */
  const { buildId, ...body } = params;
  return apiFetch(`/api/orchestration/builds/${encodeURIComponent(buildId)}/finalize`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// PUBLIC_INTERFACE
export async function getOrchestrationByBuild(buildId: UUID): Promise<any> {
  /** Fetch orchestration record via GET /api/orchestration/builds/{id}. */
  return apiFetch(`/api/orchestration/builds/${encodeURIComponent(buildId)}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

// PUBLIC_INTERFACE
export async function updatePersona(params: {
  personaId: UUID;
  title?: string | null;
  personaJson?: Record<string, any> | null;
}): Promise<any> {
  /** Update persona metadata and optional persona JSON via PUT /api/personas/{id}. */
  const { personaId, ...body } = params;
  return apiFetch(`/api/personas/${encodeURIComponent(personaId)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export interface DocumentRecord {
  id: UUID;
  userId?: UUID | null;
  originalFilename: string;
  mimeType?: string | null;
  source?: string | null;
  storageProvider?: string | null;
  storagePath?: string | null;
  fileSizeBytes?: number | null;
  sha256?: string | null;
  createdAt: string;
  updatedAt: string;
}

// PUBLIC_INTERFACE
export async function listDocuments(params: { limit?: number; offset?: number } = {}): Promise<DocumentRecord[]> {
  /** List document metadata via GET /api/documents?limit=..&offset=.. */
  const qs = new URLSearchParams();
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));

  const path = qs.toString() ? `/api/documents?${qs.toString()}` : '/api/documents';
  const res = await apiFetch<any>(path, { method: 'GET', cache: 'no-store' });

  // Some implementations may return { documents: [...] }; accept both shapes.
  if (Array.isArray(res)) return res as DocumentRecord[];
  if (res && typeof res === 'object' && Array.isArray((res as any).documents)) return (res as any).documents as DocumentRecord[];
  return [];
}

// PUBLIC_INTERFACE
export async function uploadDocuments(params: { files: File[]; userId?: UUID; category?: string }): Promise<any> {
  /**
   * Upload documents via POST /api/uploads/documents (multipart/form-data).
   *
   * Backend expects multipart field name `files`.
   */
  const form = new FormData();
  for (const f of params.files) {
    form.append('files', f, f.name);
  }
  if (params.userId) form.append('userId', params.userId);
  if (params.category) form.append('category', params.category);

  return apiFetch('/api/uploads/documents', {
    method: 'POST',
    body: form,
  });
}
