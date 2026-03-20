'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

type MvpSafeAction = {
  label: string;
  href: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
};

type MvpSafePlaceholderProps = {
  title: string;
  description: string;
  statusLabel?: string;
  actions?: MvpSafeAction[];
  children?: React.ReactNode;
};

function safeActions(actions: MvpSafeAction[] | undefined): MvpSafeAction[] {
  if (!actions || !Array.isArray(actions)) return [];
  return actions
    .map((a) => ({
      label: String(a?.label ?? '').trim(),
      href: String(a?.href ?? '').trim(),
      variant: a?.variant ?? 'default',
    }))
    .filter((a) => a.label && a.href);
}

// PUBLIC_INTERFACE
export default function MvpSafePlaceholder(props: MvpSafePlaceholderProps) {
  /** Non-blocking placeholder surface for non-MVP pages; prevents runtime errors and provides safe navigation back to MVP flow. */
  const actions = safeActions(props.actions);

  return (
    <main className="min-h-svh px-6 py-10 md:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="border-border/60 bg-background/70 backdrop-blur-sm shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[18px] md:text-[22px]">{props.title}</CardTitle>
                <CardDescription className="mt-1 text-[13px] md:text-[14px] leading-relaxed">
                  {props.description}
                </CardDescription>
              </div>

              {props.statusLabel ? (
                <span className="shrink-0 rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-200/90">
                  {props.statusLabel}
                </span>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {props.children ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foreground/90">
                {props.children}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button key={`${a.href}-${a.label}`} asChild variant={a.variant ?? 'default'}>
                  <Link href={a.href}>{a.label}</Link>
                </Button>
              ))}

              {/* Always include a safe fallback back to the MVP start */}
              <Button asChild variant="outline">
                <Link href="/ingestion">Go to Ingestion (MVP)</Link>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              This page is MVP-safe: it won’t block persona creation or role exploration.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
