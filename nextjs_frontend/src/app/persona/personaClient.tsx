'use client';

import React from 'react';
import { apiFetch } from '@/lib/apiClient';
import { loadPersonaId } from '@/lib/personaStorage';
import { getTargetRoleId } from '@/lib/targetRoleStorage';

function getUserKey(): string {
  const personaId = loadPersonaId();
  if (personaId) return personaId;

  const storageKey = 'career_navigator_anon_user_key';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim()) return existing.trim();
    const created = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `anon_${Date.now()}`;
  }
}

// PUBLIC_INTERFACE
export default function PersonaClient() {
  /** Persona overview showing current role (from ingestion) and target role (from Explore). */
  const [loading, setLoading] = React.useState(true);
  const [ctx, setCtx] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const userKey = getUserKey();
        const res = await apiFetch(`/api/profile/roles?user_id=${encodeURIComponent(userKey)}`, { method: 'GET' });
        if (cancelled) return;

        const targetRoleFromLocal = getTargetRoleId();
        const targetRoleId = res?.targetRole?.roleId || targetRoleFromLocal || null;

        setCtx({
          ...res,
          persona: res?.persona ?? null,
          targetRole: { ...(res?.targetRole || null), roleId: targetRoleId },
        });
      } catch (e: any) {
        if (cancelled) return;
        setCtx(null);
        setError('Could not load persona role context.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentRoleTitle = ctx?.currentRole?.currentRoleTitle || null;
  const targetRoleId = ctx?.targetRole?.roleId || null;

  const persona = ctx?.persona || null;
  const personaFullName = typeof persona?.full_name === 'string' ? persona.full_name.trim() : '';
  const personaCurrentRole =
    (typeof persona?.current_role === 'string' ? persona.current_role.trim() : '') ||
    (typeof persona?.professional_title === 'string' ? persona.professional_title.trim() : '');

  const displayName = personaFullName || (ctx?.userId ? String(ctx.userId) : 'User');
  const displayDesignation = personaCurrentRole || currentRoleTitle || null;

  return (
    <div className="px-8 py-8 bg-transparent min-h-screen font-sans text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="border-b border-border pb-6">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
              {displayDesignation ? displayDesignation : 'Current role not detected yet'}
            </div>
            <h1 className="text-4xl font-extrabold text-primary tracking-tight">{displayName}</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Your current role is extracted from your documents during ingestion. Your target role is set from Explore.
          </p>
        </header>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-secondary border-t-primary rounded-full animate-spin mb-4" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl border border-border bg-secondary text-foreground">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="p-6 rounded-2xl border border-border bg-background">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Current role</div>
              <div className="mt-2 text-xl font-bold text-foreground">{currentRoleTitle ? currentRoleTitle : 'Not detected yet'}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {currentRoleTitle
                  ? 'This is used as the center node of your Mind Map.'
                  : 'Upload a resume/performance review to extract your current role.'}
              </div>
            </section>

            <section className="p-6 rounded-2xl border border-border bg-background">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Target role</div>
              <div className="mt-2 text-xl font-bold text-foreground">{targetRoleId ? targetRoleId : '—'}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {targetRoleId
                  ? 'This is selected in Explore and shown in the Mind Map “Target role details” tab.'
                  : 'No target role is selected yet. Set one from Explore to see details here.'}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
