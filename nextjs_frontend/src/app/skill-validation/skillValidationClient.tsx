'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Textarea } from '@/app/components/ui/textarea';
import { loadPersona, loadPersonaId } from '@/lib/personaStorage';

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Quick-reply options shown under the assistant message (if this message is the latest assistant prompt). */
  options?: string[];
};

type PersonaContext = {
  title: string;
  summary: string;
  headline: string;
  skills: string[];
  strengths: string[];
};

type Step =
  | 'intro'
  | 'choose_focus'
  | 'choose_skill'
  | 'collect_example'
  | 'followup_impact'
  | 'wrapup'
  | 'done';

function safeTrim(v: unknown): string {
  return String(v ?? '').trim();
}

function toTopUnique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const v = safeTrim(item);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

function derivePersonaContext(personaJson: any): PersonaContext | null {
  if (!personaJson || typeof personaJson !== 'object') return null;

  const title = safeTrim(personaJson?.title);
  const summary = safeTrim(personaJson?.summary);
  const headline = safeTrim(personaJson?.profile?.headline || personaJson?.headline);

  const skillsRaw = Array.isArray(personaJson?.skills) ? personaJson.skills : [];
  const strengthsRaw = Array.isArray(personaJson?.strengths) ? personaJson.strengths : [];

  return {
    title,
    summary,
    headline,
    skills: toTopUnique(skillsRaw.map(String), 8),
    strengths: toTopUnique(strengthsRaw.map(String), 6),
  };
}

function makeId(prefix: string, n: number): string {
  return `${prefix}_${n}_${Date.now()}`;
}

// PUBLIC_INTERFACE
export default function SkillValidationClient() {
  /**
   * Guided “chat-like” Skill Validation experience.
   *
   * Notes:
   * - This is a frontend-only guided flow (no backend dependency), intended to feel like a chat.
   * - Uses localStorage persona (when available) to personalize prompts.
   * - The assistant is described as a “Bedrock assistant” (not Claude).
   */
  const [persona, setPersona] = useState<PersonaContext | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const nextId = useRef<number>(1);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const personaLabel = useMemo(() => {
    const headline = safeTrim(persona?.headline);
    const title = safeTrim(persona?.title);
    return headline || title || 'your persona';
  }, [persona?.headline, persona?.title]);

  const topSkills = useMemo(() => {
    const base = persona?.skills?.length ? persona.skills : ['Communication', 'Problem solving', 'Leadership', 'Data analysis'];
    return toTopUnique(base, 4);
  }, [persona?.skills]);

  const appendMessage = (partial: Omit<ChatMessage, 'id'>) => {
    const id = makeId(partial.role, nextId.current++);
    setMessages((prev) => [...prev, { id, ...partial }]);
  };

  const latestAssistantWithOptions = useMemo(() => {
    // Only render options for the most recent assistant message that includes options.
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'assistant' && m.options?.length) return m;
    }
    return null;
  }, [messages]);

  const scrollToBottom = () => {
    // ScrollArea uses an internal viewport; we hook the ref below.
    if (!scrollViewportRef.current) return;
    scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    // Load persona context best-effort.
    try {
      const personaId = loadPersonaId();
      if (!personaId) {
        setPersona(null);
        return;
      }
      const personaJson = loadPersona(personaId);
      setPersona(derivePersonaContext(personaJson));
    } catch {
      setPersona(null);
    }
  }, []);

  useEffect(() => {
    // Initialize conversation once persona loading has settled.
    if (messages.length) return;

    const introLines: string[] = [];
    introLines.push(`Hi — I’m your Bedrock assistant for Skill Validation.`);
    introLines.push(
      `I’ll ask a short set of questions to validate competencies for ${personaLabel}.`
    );

    if (!persona) {
      introLines.push(
        `I couldn’t find a saved persona yet. You can still try the flow, but it works best after you’ve generated a persona.`
      );
    }

    introLines.push(`Ready to start?`);

    appendMessage({
      role: 'assistant',
      content: introLines.join('\n\n'),
      options: ['Yes, let’s start', 'Not right now'],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona, personaLabel]);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const getPromptForStep = (nextStep: Step): Omit<ChatMessage, 'id'> => {
    if (nextStep === 'choose_focus') {
      return {
        role: 'assistant',
        content:
          `Great. What would you like to validate today?\n\n` +
          `Pick a focus area or type your own.`,
        options: [
          'Validate a specific skill',
          'Validate leadership/ownership',
          'Validate communication',
          'Other…',
        ],
      };
    }

    if (nextStep === 'choose_skill') {
      const suggested = topSkills;
      return {
        role: 'assistant',
        content:
          `Which skill should we validate first?\n\n` +
          (persona?.skills?.length
            ? `Based on ${personaLabel}, here are a few options:`
            : `Here are some common options:`),
        options: [...suggested, 'Other…'],
      };
    }

    if (nextStep === 'collect_example') {
      const skill = selectedSkill || 'that skill';
      return {
        role: 'assistant',
        content:
          `Tell me about a recent project where you used **${skill}**.\n\n` +
          `Include: context, what you personally did, and the outcome.\n\n` +
          `If you’re stuck, choose an option below.`,
        options: ['I have an example', 'Help me recall an example', 'Skip'],
      };
    }

    if (nextStep === 'followup_impact') {
      const skill = selectedSkill || 'this';
      return {
        role: 'assistant',
        content:
          `Thanks. Two quick follow-ups to validate **${skill}**:\n\n` +
          `1) What was the measurable impact (time saved, revenue, reliability, quality, etc.)?\n` +
          `2) What was the hardest tradeoff or constraint you navigated?`,
        options: ['Share impact + tradeoff', 'Share impact only', 'Skip'],
      };
    }

    if (nextStep === 'wrapup') {
      const skill = selectedSkill || 'the selected skill';
      const strengthHint =
        persona?.strengths?.length ? `\n\nPersona strengths to lean on: ${persona.strengths.slice(0, 3).join(', ')}.` : '';
      return {
        role: 'assistant',
        content:
          `Nice work. Here’s a quick validation summary for **${skill}**:\n\n` +
          `• Evidence: you provided a concrete example (project + actions).\n` +
          `• Depth: next time, add numbers and a clear tradeoff.\n` +
          `• Story structure: aim for Context → Actions → Results.\n` +
          strengthHint +
          `\n\nWant to validate another skill?`,
        options: ['Yes — pick another skill', 'No — I’m done'],
      };
    }

    return {
      role: 'assistant',
      content: `Thanks — want to continue?`,
      options: ['Yes', 'No'],
    };
  };

  const advance = (nextStep: Step) => {
    setStep(nextStep);
    const prompt = getPromptForStep(nextStep);
    appendMessage(prompt);
  };

  const handleUserText = async (text: string) => {
    const userText = safeTrim(text);
    if (!userText) return;

    setIsSending(true);
    appendMessage({ role: 'user', content: userText });
    setDraft('');

    // Small delay to keep the interaction feeling chat-like without relying on backend.
    await new Promise((r) => setTimeout(r, 250));

    // Step transitions (guided flow).
    if (step === 'intro') {
      const normalized = userText.toLowerCase();
      if (normalized.includes('not') || normalized.includes('later') || normalized.includes('no')) {
        appendMessage({
          role: 'assistant',
          content:
            `No problem. When you’re ready, come back here and we’ll do a quick competency validation run.\n\n` +
            `Tip: generate a persona first for more tailored questions.`,
          options: ['Go to Ingestion', 'Go to Persona'],
        });
        setStep('done');
        setIsSending(false);
        return;
      }
      advance('choose_focus');
      setIsSending(false);
      return;
    }

    if (step === 'choose_focus') {
      const normalized = userText.toLowerCase();
      if (normalized.includes('skill')) {
        advance('choose_skill');
        setIsSending(false);
        return;
      }
      if (normalized.includes('communication')) {
        setSelectedSkill('Communication');
        advance('collect_example');
        setIsSending(false);
        return;
      }
      if (normalized.includes('lead')) {
        setSelectedSkill('Leadership / Ownership');
        advance('collect_example');
        setIsSending(false);
        return;
      }
      // Free-text focus becomes the “skill” being validated.
      setSelectedSkill(userText);
      advance('collect_example');
      setIsSending(false);
      return;
    }

    if (step === 'choose_skill') {
      // User typed a skill.
      setSelectedSkill(userText);
      advance('collect_example');
      setIsSending(false);
      return;
    }

    if (step === 'collect_example') {
      // Capture example (we keep it in chat only; no persistence).
      advance('followup_impact');
      setIsSending(false);
      return;
    }

    if (step === 'followup_impact') {
      advance('wrapup');
      setIsSending(false);
      return;
    }

    if (step === 'wrapup') {
      const normalized = userText.toLowerCase();
      if (normalized.includes('another') || normalized.startsWith('y')) {
        setSelectedSkill('');
        advance('choose_skill');
        setIsSending(false);
        return;
      }
      appendMessage({
        role: 'assistant',
        content:
          `All set. If you want, you can repeat this for 2–3 more skills and you’ll have strong, interview-ready evidence stories.`,
      });
      setStep('done');
      setIsSending(false);
      return;
    }

    // Fallback
    appendMessage({ role: 'assistant', content: `Got it. Want to validate another skill?`, options: ['Yes', 'No'] });
    setIsSending(false);
  };

  const handleQuickOption = async (option: string) => {
    const v = safeTrim(option);
    if (!v) return;

    if (step === 'done') {
      // Navigation-like options when done.
      if (v.toLowerCase().includes('ingestion')) return;
      if (v.toLowerCase().includes('persona')) return;
    }

    // Map some options to more specific transitions.
    if (step === 'intro') {
      if (v.toLowerCase().includes('yes')) {
        await handleUserText(v);
        return;
      }
      if (v.toLowerCase().includes('not')) {
        await handleUserText(v);
        return;
      }
    }

    if (step === 'choose_focus') {
      if (v.toLowerCase().includes('validate a specific skill')) {
        await handleUserText('Validate a specific skill');
        return;
      }
      if (v.toLowerCase().includes('leadership')) {
        await handleUserText('Validate leadership');
        return;
      }
      if (v.toLowerCase().includes('communication')) {
        await handleUserText('Validate communication');
        return;
      }
      if (v.toLowerCase().includes('other')) {
        appendMessage({
          role: 'assistant',
          content: `What skill or focus area should we validate? Type it in one short phrase.`,
        });
        // Keep step as choose_focus but we’ll treat the next user message as the skill.
        setSelectedSkill('');
        setIsSending(false);
        return;
      }
    }

    if (step === 'choose_skill') {
      if (v.toLowerCase().includes('other')) {
        appendMessage({
          role: 'assistant',
          content: `Type the skill you want to validate (e.g., “Stakeholder management”, “SQL optimization”, “Systems design”).`,
        });
        return;
      }
      await handleUserText(v);
      return;
    }

    if (step === 'collect_example') {
      if (v.toLowerCase().includes('skip')) {
        await handleUserText('Skip');
        return;
      }
      if (v.toLowerCase().includes('help')) {
        appendMessage({
          role: 'assistant',
          content:
            `Try one of these memory triggers:\n\n` +
            `• A time you reduced risk or fixed something broken\n` +
            `• A time you improved speed/quality/cost\n` +
            `• A time you unblocked a team or stakeholder\n\n` +
            `Pick one and describe what you did.`,
        });
        return;
      }
      // "I have an example" just nudges user to type it.
      appendMessage({
        role: 'assistant',
        content: `Great — write 4–8 sentences. Focus on what *you* did and the outcome.`,
      });
      return;
    }

    if (step === 'followup_impact') {
      if (v.toLowerCase().includes('skip')) {
        await handleUserText('Skip');
        return;
      }
      appendMessage({
        role: 'assistant',
        content:
          `Go ahead and share what you can. Even an estimate is useful (e.g., “reduced cycle time ~20%”).`,
      });
      return;
    }

    if (step === 'wrapup') {
      await handleUserText(v);
      return;
    }

    await handleUserText(v);
  };

  const onSubmit = async () => {
    if (isSending) return;
    await handleUserText(draft);
  };

  // Quick-reply option "chips" styling (page-specific override on top of the shared outline button variant).
  // Requirements:
  // - default: white container with black text
  // - hover: highlight text purple (do NOT flip the text to white)
  const quickOptionClassName =
    'bg-white text-black border-black/15 hover:bg-white hover:text-violet-600 focus-visible:ring-violet-500/25 focus-visible:border-violet-400';

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8 py-6 md:py-10">
        <header className="mb-5 md:mb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Skill Validation
              </h1>
              <p className="mt-1 text-sm md:text-[15px] text-muted-foreground">
                A short guided chat to validate competencies for {personaLabel}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/persona">Persona</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/ingestion">Ingestion</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Chat surface - keep existing app aesthetic (glass/violet tint), not the screenshot styling */}
        <section
          className={[
            'rounded-2xl border border-white/10',
            'bg-[linear-gradient(180deg,rgba(139,92,246,0.10)_0%,rgba(255,255,255,0.06)_100%)]',
            'backdrop-blur-xl',
            'shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
            'overflow-hidden',
          ].join(' ')}
          aria-label="Skill validation chat"
        >
          <div className="px-4 md:px-6 py-4 border-b border-white/10">
            <div className="text-sm font-semibold text-foreground">Bedrock assistant</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Guided validation questions based on your saved persona (when available).
            </div>
          </div>

          <ScrollArea className="h-[52vh] md:h-[56vh]">
            <div
              // Grab the internal viewport so we can scroll to bottom reliably
              // eslint-disable-next-line react/no-unknown-property
              ref={(node) => {
                // Radix ScrollArea renders a Viewport inside; we can safely select it from the container
                // once mounted.
                if (!node) return;
                const viewport = node.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement | null;
                if (viewport) scrollViewportRef.current = viewport;
              }}
              className="px-4 md:px-6 py-4"
            >
              <div className="flex flex-col gap-3">
                {messages.map((m) => {
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div
                      key={m.id}
                      className={['flex w-full', isAssistant ? 'justify-start' : 'justify-end'].join(' ')}
                    >
                      <div
                        className={[
                          'max-w-[92%] md:max-w-[80%] rounded-2xl px-4 py-3',
                          'text-sm leading-relaxed whitespace-pre-wrap',
                          isAssistant
                            ? 'bg-white/6 border border-white/10 text-foreground'
                            : 'bg-violet-500/18 border border-violet-300/20 text-foreground',
                        ].join(' ')}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}

                {/* Quick options: only show for the latest assistant message that has them and while not sending */}
                {!isSending && latestAssistantWithOptions?.options?.length ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {latestAssistantWithOptions.options.map((opt) => {
                      const lower = opt.toLowerCase();
                      const isNav = step === 'done' && (lower.includes('ingestion') || lower.includes('persona'));
                      if (isNav && lower.includes('ingestion')) {
                        return (
                          <Button key={opt} variant="outline" size="sm" className={quickOptionClassName} asChild>
                            <Link href="/ingestion">{opt}</Link>
                          </Button>
                        );
                      }
                      if (isNav && lower.includes('persona')) {
                        return (
                          <Button key={opt} variant="outline" size="sm" className={quickOptionClassName} asChild>
                            <Link href="/persona">{opt}</Link>
                          </Button>
                        );
                      }

                      return (
                        <Button
                          key={opt}
                          variant="outline"
                          size="sm"
                          className={quickOptionClassName}
                          onClick={() => void handleQuickOption(opt)}
                        >
                          {opt}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </ScrollArea>

          <div className="border-t border-white/10 px-4 md:px-6 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmit();
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={step === 'done' ? 'Start another validation or navigate above…' : 'Type your response…'}
                className="min-h-10 max-h-36"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSubmit();
                  }
                }}
                aria-label="Chat input"
                disabled={isSending}
              />

              <Button type="submit" disabled={isSending || !safeTrim(draft)}>
                <SendHorizonal />
                Send
              </Button>
            </form>

            <div className="mt-2 text-[11px] text-muted-foreground">
              Press <span className="font-semibold">Enter</span> to send,{' '}
              <span className="font-semibold">Shift+Enter</span> for a new line.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
