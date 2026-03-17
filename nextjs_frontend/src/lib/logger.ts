/**
 * Lightweight structured logger used to avoid excessive console spam.
 *
 * The UI uses throttled logging in high-frequency loops (e.g., polling).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  throttleMs?: number;
  key?: string;
}

type ThrottleState = {
  lastAt: number;
};

const throttles = new Map<string, ThrottleState>();

function shouldLog(key: string, throttleMs: number): boolean {
  const now = Date.now();
  const state = throttles.get(key);
  if (!state) {
    throttles.set(key, { lastAt: now });
    return true;
  }
  if (now - state.lastAt >= throttleMs) {
    state.lastAt = now;
    return true;
  }
  return false;
}

function parseLevelFromEnv(): LogLevel {
  const raw = (process.env.NEXT_PUBLIC_LOG_LEVEL ?? '').toLowerCase().trim();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return 'info';
}

function allow(level: LogLevel, min: LogLevel): boolean {
  const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  return order[level] >= order[min];
}

function fmt(scope: string, level: LogLevel, message: string) {
  return `[${scope}][${level}] ${message}`;
}

export interface Logger {
  debug: (message: string, meta?: any, opts?: LogOptions) => void;
  info: (message: string, meta?: any, opts?: LogOptions) => void;
  warn: (message: string, meta?: any, opts?: LogOptions) => void;
  error: (message: string, meta?: any, opts?: LogOptions) => void;
}

// PUBLIC_INTERFACE
export function createLogger(scope: string): Logger {
  /** Create a scoped logger with optional per-call throttling. */
  const minLevel = parseLevelFromEnv();

  const log = (level: LogLevel, message: string, meta?: any, opts?: LogOptions) => {
    if (!allow(level, minLevel)) return;

    const throttleMs = typeof opts?.throttleMs === 'number' ? opts.throttleMs : 0;
    const key = opts?.key ? `${scope}:${opts.key}` : '';

    if (throttleMs > 0 && key) {
      if (!shouldLog(key, throttleMs)) return;
    }

    // Avoid forcing JSON serialization (can be expensive); pass meta as-is.
    if (level === 'error') console.error(fmt(scope, level, message), meta ?? '');
    else if (level === 'warn') console.warn(fmt(scope, level, message), meta ?? '');
    else if (level === 'debug') console.debug(fmt(scope, level, message), meta ?? '');
    else console.log(fmt(scope, level, message), meta ?? '');
  };

  return {
    debug: (m, meta, opts) => log('debug', m, meta, opts),
    info: (m, meta, opts) => log('info', m, meta, opts),
    warn: (m, meta, opts) => log('warn', m, meta, opts),
    error: (m, meta, opts) => log('error', m, meta, opts),
  };
}
