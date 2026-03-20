export type RetryState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
  attempt: number;
};

function toErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error. Please retry.';
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;

  // ApiError from apiClient has shape { status, payload }
  if (typeof err === 'object' && err && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }

  // Sometimes payloads are returned directly
  if (typeof err === 'object' && err && 'error' in err && typeof (err as any).error === 'string') {
    const msg = typeof (err as any).message === 'string' ? (err as any).message : null;
    return msg ? `${(err as any).error}: ${msg}` : (err as any).error;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error. Please retry.';
  }
}

/**
 * A tiny helper for retry-safe UI actions:
 * - prevents overlapping runs
 * - tracks attempts
 * - normalizes error messages for UI
 */
// PUBLIC_INTERFACE
export function createRetryableAsync<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  opts?: { allowConcurrent?: boolean },
) {
  /** Creates a retry-safe async runner with state and an idempotent "run" wrapper. */
  let inFlight = false;

  const initialState: RetryState<TResult> = {
    loading: false,
    error: null,
    data: null,
    attempt: 0,
  };

  return {
    initialState,
    // PUBLIC_INTERFACE
    async run(
      setState: (updater: (prev: RetryState<TResult>) => RetryState<TResult>) => void,
      ...args: TArgs
    ): Promise<TResult | null> {
      /** Runs the underlying async fn with concurrency guard and state updates. */
      if (inFlight && !opts?.allowConcurrent) return null;
      inFlight = true;

      setState((prev) => ({ ...prev, loading: true, error: null, attempt: prev.attempt + 1 }));

      try {
        const res = await fn(...args);
        setState((prev) => ({ ...prev, loading: false, data: res, error: null }));
        return res;
      } catch (e) {
        setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(e) }));
        return null;
      } finally {
        inFlight = false;
      }
    },
  };
}
