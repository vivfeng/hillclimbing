// Conversation transcripts and failure-cluster patterns adapted from the
// strova-ai/customer_support_conversations_dataset (HuggingFace, public),
// then re-clustered into the why × where structure used by the Workbench.
// Volume / containment / deflection numbers are illustrative for the prototype.
// Source: https://huggingface.co/datasets/strova-ai/customer_support_conversations_dataset

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, Brain, Shield, Wrench, RotateCcw, Lock, Eye, EyeOff, Check,
  Loader2, ChevronRight, Sparkles, ArrowUpRight, Inbox, AlertTriangle, Filter, Database,
} from 'lucide-react';

const DATASET_URL = 'https://huggingface.co/datasets/strova-ai/customer_support_conversations_dataset';

/* ============================== FIXTURES ============================== */

const WHY = {
  knowledge: { label: 'Knowledge', icon: BookOpen, text: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  reasoning: { label: 'Reasoning', icon: Brain,    text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  policy:    { label: 'Policy',    icon: Shield,   text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  tool:      { label: 'Tool',      icon: Wrench,   text: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
};

const CLUSTERS = [
  {
    id: 'c1', name: 'Extended return window confusion', intent: 'Refunds', why: 'knowledge',
    volumePerDay: 142, containment: 71, deflection: 44, csatDrag: -0.31, projectedLift: 4.2,
    confidence: 0.34, source: 'imported',
    gap: '"I don\'t have information about extended return windows" + 14 paraphrases — 89 conversations / wk',
    transcripts: [
      { u: 'I bought a sweater on Black Friday and need to return it. Site says holiday returns go through Jan 31?', a: "I don't have specific information about extended holiday return windows. Standard returns are 30 days. Would you like to be transferred?" },
      { u: 'Your email said I had until February to return this. What is the actual policy?', a: "Our standard return policy is 30 days. I'm not sure about extended periods. Let me transfer you." },
      { u: 'Trying to understand the return window for gifts', a: "Returns must be initiated within 30 days. I don't have details on gift-specific or extended return windows." },
    ],
    action: 'Add extended-returns policy article to KB (covers holiday window + gift returns)',
    owner: 'Docs',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 4,
    validation: { rephraseRate: -38, escalationRate: -42, repeatRate48h: -29, csat: { delta: 0.6, n: 47 } },
  },
  {
    id: 'c2', name: 'Promo code stacking error', intent: 'Promotions', why: 'reasoning',
    volumePerDay: 98, containment: 64, deflection: 31, csatDrag: -0.42, projectedLift: 3.1,
    confidence: 0.41, source: 'imported',
    gap: 'Agent applies non-stackable codes then silently reverses one — 61 conversations / wk',
    transcripts: [
      { u: 'I have SPRING20 and FRIENDS15 — can I use both?', a: 'Yes, both are valid. Applying… Actually, FRIENDS15 was removed. Your total is now $84.99.' },
      { u: 'Why did the discount change at checkout?', a: 'Codes were re-evaluated. Only one promotional code may apply per order.' },
    ],
    action: 'Add stacking-rules pre-check to agent prompt before quoting any total',
    owner: 'Agent Config',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 6,
    validation: { rephraseRate: -22, escalationRate: -31, repeatRate48h: -18, csat: { delta: 0.4, n: 32 } },
  },
  {
    id: 'c3', name: 'Order tracking lookup timeout', intent: 'Order status', why: 'tool',
    volumePerDay: 124, containment: 58, deflection: 22, csatDrag: -0.55, projectedLift: 5.1,
    confidence: 0.28, source: 'native',
    gap: 'Carrier API times out at 8s; agent escalates 73% of timeout cases — 91 conversations / wk',
    transcripts: [
      { u: "Where's my order #4471892?", a: "I'm having trouble looking that up right now. Let me connect you with someone who can help." },
      { u: 'Can you check tracking on order 4470229?', a: 'Looking that up… I am unable to retrieve tracking details at this time.' },
    ],
    action: 'Raise carrier-API timeout to 15s + add cached-tracking fallback for last-known status',
    owner: 'Engineering',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 12,
    validation: { rephraseRate: -8, escalationRate: -64, repeatRate48h: -41, csat: { delta: 0.7, n: 58 } },
  },
  {
    id: 'c4', name: 'Subscription pause not honored', intent: 'Subscriptions', why: 'policy',
    volumePerDay: 67, containment: 52, deflection: 28, csatDrag: -0.61, projectedLift: 2.4,
    confidence: 0.39, source: 'native',
    gap: 'Pause requested mid-cycle still ships next box — policy ambiguous on cutoff — 48 conv / wk',
    transcripts: [
      { u: 'I paused my subscription last week and got charged again this morning?', a: 'Pauses take effect at the next billing cycle. Your charge was already processed.' },
      { u: 'I clearly clicked pause on the 12th. Why am I being shipped today?', a: 'Pause requests apply to future cycles, not the current one.' },
    ],
    action: 'Decision needed → Subscription PM: define pause cutoff window relative to ship date',
    owner: 'Policy (Subs PM)',
    statusByDay: { 7: 'open', 21: 'open' }, shippedDay: null, validation: null,
  },
  {
    id: 'c5', name: 'Address change after carrier handoff', intent: 'Shipping', why: 'policy',
    volumePerDay: 54, containment: 49, deflection: 19, csatDrag: -0.48, projectedLift: 1.8,
    confidence: 0.43, source: 'native',
    gap: 'Agents promise address changes after pickup — operationally impossible — 36 conv / wk',
    transcripts: [
      { u: 'I need to change the delivery address on order 4468121', a: "I can update that for you. What's the new address?" },
      { u: "Update didn't go through — package shipped to old address", a: 'Once the carrier picks up, address changes need to go through them directly.' },
    ],
    action: 'Update prompt: check shipment status before promising address change; escalate if shipped',
    owner: 'Agent Config',
    statusByDay: { 7: 'open', 21: 'open' }, shippedDay: null, validation: null,
  },
  {
    id: 'c6', name: 'Loyalty points expiration unclear', intent: 'Account', why: 'knowledge',
    volumePerDay: 41, containment: 76, deflection: 51, csatDrag: -0.18, projectedLift: 0.8,
    confidence: 0.52, source: 'native',
    gap: 'Tier-specific expiration windows missing from KB — 27 conversations / wk',
    transcripts: [
      { u: 'When do my Gold tier points expire?', a: "Points generally expire 12 months after they're earned. I don't have tier-specific details." },
    ],
    action: 'Add tier-specific points-expiration table to KB',
    owner: 'Docs',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 19,
    validation: { rephraseRate: -19, escalationRate: -24, repeatRate48h: -16, csat: { delta: 0.3, n: 14 } },
  },
];

const SLOPE = (() => {
  const out: { day: number; deflection: number; containment: number; csat: number; csatN: number }[] = [];
  for (let d = 0; d <= 30; d++) {
    let def: number, con: number;
    if (d <= 5)       { def = 38 + d * 0.6;            con = 64 + d * 0.3; }
    else if (d <= 25) { def = 41 + (d - 5) * 0.95;     con = 65.5 + (d - 5) * 0.45; }
    else              { def = 60 + (d - 25) * 0.4;     con = 74.5 + (d - 25) * 0.2; }
    const wob = (n: number) => Math.sin(d * 0.55 + n) * 0.5;
    out.push({
      day: d,
      deflection:  +(def + wob(1)).toFixed(1),
      containment: +(con + wob(2)).toFixed(1),
      csat:        +(3.4 + d * 0.022 + wob(3) * 0.04).toFixed(2),
      csatN: 6 + Math.floor(d * 1.1),
    });
  }
  return out;
})();

const TIMELINE = [
  { day: 4,  clusterId: 'c1', name: 'Extended return window confusion', action: 'Added KB article on holiday + gift return windows',  deflectionLift: 3.8, intent: 'Refunds',     owner: 'Docs' },
  { day: 6,  clusterId: 'c2', name: 'Promo code stacking error',         action: 'Added stacking-rules pre-check to agent prompt',     deflectionLift: 2.1, intent: 'Promotions',  owner: 'Agent Config' },
  { day: 9,  clusterId: null, name: 'Billing escalation threshold',      action: 'Lowered confidence threshold for billing handoffs',  csatLift: 0.4,       intent: 'Billing',     owner: 'Agent Config' },
  { day: 12, clusterId: 'c3', name: 'Order tracking timeout',            action: 'Raised carrier API timeout + cached fallback',       deflectionLift: 5.1, intent: 'Order status',owner: 'Engineering' },
  { day: 16, clusterId: null, name: 'BOPIS pickup window mismatch',      action: 'Synced fulfillment window doc with store ops',       deflectionLift: 1.4, intent: 'Fulfillment', owner: 'Docs' },
  { day: 19, clusterId: 'c6', name: 'Loyalty points expiration',         action: 'Added tier-specific expiration table',               deflectionLift: 0.8, intent: 'Account',     owner: 'Docs' },
] as const;

const SNAPSHOT: Record<number, { deflection: number; containment: number; csat: number; slopePerWeek: number; monthlyVolume: number; costPerTicket: number }> = {
  7:  { deflection: 44.2, containment: 67.8, csat: 3.55, slopePerWeek: 0.9, monthlyVolume: 47200, costPerTicket: 8.50 },
  21: { deflection: 58.4, containment: 73.9, csat: 3.92, slopePerWeek: 3.2, monthlyVolume: 47200, costPerTicket: 8.50 },
};

const ANNOTATIONS = {
  workbench: [
    { n: 1, t: 'Containment vs. deflection are surfaced as two distinct numbers on every cluster — never blurred. Protects Decagon when a competitor quietly reports containment as deflection.' },
    { n: 2, t: 'Clusters ranked by volume × (1 − confidence) × outcome severity — operator never goes hunting for what to fix next.' },
    { n: 3, t: 'Why × where chips make the 2D failure structure tangible — every cluster filterable along both axes; the intersection is the actionable unit.' },
    { n: 4, t: '"Head-start" badge: cross-customer anonymized patterns pre-populate on day 1, native clusters take over by day 3. This is why the Workbench is useful on day one, not day seven.' },
    { n: 5, t: 'Auto-detected gap surfaces the exact failure utterance + paraphrase count — no manual transcript hunting.' },
    { n: 6, t: 'Recommended action carries projected lift inline + the right internal owner. Every metric ties to a fix; no naked numbers anywhere on screen.' },
    { n: 7, t: 'Validation uses implicit signals (rephrase, mid-flow escalation, 48h repeat) so operators see fix impact within hours — CSAT confirms later. The fast loop lives on the same surface as the fix.' },
    { n: 8, t: 'Versioned edit + one-click rollback bounds downside of any single change. This is what keeps iteration velocity (and slope) high through the trial.' },
  ],
  scorecard: [
    { n: 1, t: 'Headline is rate-of-change per week, not current level — slope wins bake-offs, absolute numbers do not.' },
    { n: 2, t: 'Containment (dashed) and deflection (solid) plotted as separate lines, always — definitional integrity is the Scorecard\'s core job.' },
    { n: 3, t: 'CSAT shown with response-rate context — periodic confirmation, not the daily steering signal.' },
    { n: 4, t: 'Definition lockdown badge: deflection definition was set jointly at trial start and locked, so the chart can never be re-cut to flatter it later.' },
    { n: 5, t: 'Attributed timeline links each measured lift to the Workbench cluster that produced it — story is traceable, auditable, and CSM-narratable.' },
    { n: 6, t: 'Projected ROI computed off current slope and locked baselines — the one number the buyer needs for the business case.' },
  ],
};

/* ============================== HELPERS ============================== */

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${className}`}>{children}</span>;
}

function NBadge({ n, show = true }: { n: number; show?: boolean }) {
  if (!show) return null;
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold ring-2 ring-amber-100 ml-1 shrink-0">{n}</span>;
}

function Stat({ label, sub, value, accent = false, negative = false, badge }: { label: string; sub: string; value: React.ReactNode; accent?: boolean; negative?: boolean; badge?: React.ReactNode }) {
  return (
    <div className={`relative rounded-lg border ${accent ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-white'} p-3`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-0.5 ${accent ? 'text-indigo-700' : negative ? 'text-rose-700' : 'text-slate-900'}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
      {badge && <div className="absolute -top-2 -right-2">{badge}</div>}
    </div>
  );
}

function Section({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center">{title}{badge}</h3>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`text-sm font-semibold px-3 py-1.5 rounded-md transition ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
      {children}
    </button>
  );
}

/* ============================== WORKBENCH ============================== */

type Cluster = typeof CLUSTERS[number];

function ClusterCard({ c, selected, onSelect, status, badges }: { c: Cluster; selected: boolean; onSelect: (id: string) => void; status: 'open' | 'shipped'; badges?: { containment?: number; source?: number } }) {
  const w = WHY[c.why as keyof typeof WHY];
  const Icon = w.icon;
  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`w-full text-left rounded-lg border p-3 transition ${selected ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.bg} ${w.text} border ${w.border}`}>
          <Icon className="w-3 h-3" />{w.label}
        </span>
        <span className="text-[10px] font-medium text-slate-500">{c.intent}</span>
        {c.source === 'imported' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200">
            <Sparkles className="w-3 h-3" />head-start
            {badges?.source && <NBadge n={badges.source} />}
          </span>
        )}
        {status === 'shipped' && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <Check className="w-3 h-3" />shipped
          </span>
        )}
      </div>
      <div className="font-semibold text-sm text-slate-900 leading-snug">{c.name}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-slate-500">Volume</div>
          <div className="font-semibold tabular-nums text-slate-900">{c.volumePerDay}/d</div>
        </div>
        <div>
          <div className="text-slate-500 flex items-center">Contain · Deflect{badges?.containment && <NBadge n={badges.containment} />}</div>
          <div className="font-semibold tabular-nums text-slate-900">
            {c.containment}% · <span className="text-indigo-700">{c.deflection}%</span>
          </div>
        </div>
        <div>
          <div className="text-slate-500">Proj. lift</div>
          <div className="font-semibold tabular-nums text-emerald-700">+{c.projectedLift} pts</div>
        </div>
      </div>
    </button>
  );
}

function ValidationBand({ validation, optimistic = false, badge }: { validation: any; optimistic?: boolean; badge?: React.ReactNode }) {
  if (!validation) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-500 flex items-center gap-2">
        <Inbox className="w-4 h-4" />
        Implicit-signal validation appears here within ~4 hours of shipping a fix.
      </div>
    );
  }
  const items = [
    { label: 'Rephrase rate (in-conversation)', value: validation.rephraseRate, suffix: '%', good: 'down' },
    { label: 'Mid-flow escalation requests',    value: validation.escalationRate, suffix: '%', good: 'down' },
    { label: '48h repeat contact rate',         value: validation.repeatRate48h, suffix: '%', good: 'down' },
    { label: `Explicit CSAT survey (n=${validation.csat.n || '—'})`, value: validation.csat.delta, suffix: ' ★', good: 'up' },
  ];
  return (
    <div className={`rounded-lg border ${optimistic ? 'border-dashed border-amber-300 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/30'} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center">
          {optimistic ? 'Projected — validating' : 'Measured — implicit signals + CSAT'}
          {badge}
        </div>
        {optimistic && <span className="text-[10px] text-amber-700">first reading expected in ~4h</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {items.map((it) => {
          const good = it.good === 'up' ? it.value > 0 : it.value < 0;
          const sign = it.value > 0 ? '+' : '';
          return (
            <div key={it.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{it.label}</span>
              <span className={`font-semibold tabular-nums ${good ? 'text-emerald-700' : 'text-rose-700'}`}>{sign}{it.value}{it.suffix}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function estimateValidation(c: Cluster) {
  const k = c.projectedLift;
  return {
    rephraseRate:   -Math.round(18 + k * 4),
    escalationRate: -Math.round(24 + k * 5),
    repeatRate48h:  -Math.round(14 + k * 3),
    csat: { delta: +(0.2 + k * 0.08).toFixed(1), n: 0 },
  };
}

function LoadingDetail({ c }: { c: Cluster }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
      <div className="text-sm font-semibold text-slate-900">Shipping fix to production…</div>
      <div className="text-xs text-slate-500 mt-1">Versioning edit · routing to {c.owner} · enabling for 100% of {c.intent} traffic</div>
      <div className="text-xs text-slate-400 mt-3">Implicit-signal validation typically appears in 2–4 hours.</div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      <Inbox className="w-6 h-6 mx-auto mb-2" />
      Select a cluster to inspect failures, propose a fix, and validate the change.
    </div>
  );
}

function ClusterDetail({ c, justShipped, onApply, onRollback, annotated, trialDay }: { c: Cluster; justShipped: boolean; onApply: (id: string) => void; onRollback: (id: string) => void; annotated: boolean; trialDay: number }) {
  if (!c) return <EmptyDetail />;
  const w = WHY[c.why as keyof typeof WHY];
  const Icon = w.icon;
  const dayShipped = c.statusByDay[trialDay as 7 | 21] === 'shipped';
  const isShipped = justShipped || dayShipped;
  const validation = c.validation ?? (justShipped ? estimateValidation(c) : null);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${w.bg} ${w.border} border`}><Icon className={`w-5 h-5 ${w.text}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${w.text}`}>{w.label}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.intent}</span>
            {c.source === 'imported' && (
              <Pill className="text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200">
                <Sparkles className="w-3 h-3" />head-start library
              </Pill>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{c.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Containment" sub="No-handoff rate" value={`${c.containment}%`} />
        <Stat label="Deflection" sub="Truly resolved" value={`${c.deflection}%`} accent badge={annotated ? <NBadge n={1} /> : null} />
        <Stat label="Volume" sub="Conversations / day" value={c.volumePerDay} />
        <Stat label="CSAT drag" sub="Pts on overall score" value={c.csatDrag.toFixed(2)} negative />
      </div>

      <Section title="Representative transcripts" subtitle={`${c.transcripts.length} of ~${Math.round(c.volumePerDay * 7 * 0.4)} weekly samples · adapted from strova-ai customer-support corpus`}>
        <div className="space-y-2">
          {c.transcripts.map((t, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="flex gap-2 mb-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide w-12 shrink-0">User</span>
                <span className="text-slate-800">{t.u}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide w-12 shrink-0">Agent</span>
                <span className="text-rose-900 bg-rose-50 px-1.5 py-0.5 rounded">{t.a}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="rounded-lg border-l-4 border-l-amber-400 border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 mb-0.5 flex items-center">Auto-detected gap{annotated && <NBadge n={5} />}</div>
            <div className="text-sm text-amber-900">{c.gap}</div>
          </div>
        </div>
      </div>

      <Section title="Recommended action" badge={annotated ? <NBadge n={6} /> : null}>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900 mb-1">{c.action}</div>
              <div className="text-xs text-slate-600">
                Routed to <span className="font-semibold text-slate-900">{c.owner}</span> · projected <span className="font-semibold text-emerald-700">+{c.projectedLift} pts deflection on {c.intent}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              {!isShipped && (
                <button onClick={() => onApply(c.id)} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-700 transition">
                  Apply fix <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {isShipped && (
                <>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-sm font-semibold px-3 py-1.5 rounded-md border border-emerald-200">
                    <Check className="w-4 h-4" />Shipped {justShipped && !dayShipped ? 'just now' : `day ${c.shippedDay}`}
                  </span>
                  <button onClick={() => onRollback(c.id)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition">
                    <RotateCcw className="w-3 h-3" />rollback v{23 + (c.id.charCodeAt(1) % 9)}
                    {annotated && <NBadge n={8} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Before / after" subtitle="implicit signals + CSAT confirmation">
        <ValidationBand validation={validation} optimistic={justShipped && !c.validation} badge={annotated ? <NBadge n={7} /> : null} />
      </Section>
    </div>
  );
}

function Workbench({ trialDay, annotated }: { trialDay: number; annotated: boolean }) {
  const [selected, setSelected] = useState('c1');
  const [whyFilter, setWhyFilter] = useState<string>('all');
  const [shipped, setShipped] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);

  const visible = useMemo(() => CLUSTERS.filter((c) => whyFilter === 'all' || c.why === whyFilter), [whyFilter]);
  const isShippedForView = (c: Cluster) => shipped[c.id] || c.statusByDay[trialDay as 7 | 21] === 'shipped';
  const open = visible.filter((c) => !isShippedForView(c)).sort((a, b) => b.volumePerDay * (1 - b.confidence) - a.volumePerDay * (1 - a.confidence));
  const shippedList = visible.filter(isShippedForView);

  const current = CLUSTERS.find((c) => c.id === selected) as Cluster;

  const apply = (id: string) => {
    setApplying(id);
    setTimeout(() => {
      setShipped((s) => ({ ...s, [id]: true }));
      setApplying(null);
    }, 1300);
  };
  const rollback = (id: string) => {
    setShipped((s) => { const n = { ...s }; delete n[id]; return n; });
  };

  const filters = [
    { id: 'all', label: 'All', count: CLUSTERS.length },
    ...Object.keys(WHY).map((k) => ({ id: k, label: WHY[k as keyof typeof WHY].label, count: CLUSTERS.filter((c) => c.why === k).length })),
  ];

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-5 space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5 mb-1.5">
            <Filter className="w-3 h-3" />Why × Where{annotated && <NBadge n={3} />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map((f) => {
              const active = whyFilter === f.id;
              return (
                <button key={f.id} onClick={() => setWhyFilter(f.id)} className={`text-xs font-medium px-2.5 py-1 rounded-md border transition ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                  {f.label}<span className="opacity-60 ml-1 tabular-nums">{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 inline-flex items-center">Open · ranked by leverage{annotated && <NBadge n={2} />}</div>
            <div className="text-[11px] text-slate-500">{open.length} cluster{open.length !== 1 && 's'}</div>
          </div>
          <div className="space-y-2">
            {open.length === 0 ? (
              <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center">
                <Check className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="text-sm font-semibold text-emerald-900">All clusters in this view have shipped fixes.</div>
                <div className="text-xs text-emerald-700 mt-1">Check back when new failure patterns surface — typical cadence here is 2–4 / wk.</div>
              </div>
            ) : (
              open.map((c, i) => (
                <ClusterCard key={c.id} c={c} selected={selected === c.id} onSelect={setSelected} status="open" badges={annotated && i === 0 ? { containment: 1, source: c.source === 'imported' ? 4 : undefined } : undefined} />
              ))
            )}
          </div>
        </div>

        {shippedList.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Shipped this trial · {shippedList.length}</div>
            <div className="space-y-2">
              {shippedList.map((c) => (
                <ClusterCard key={c.id} c={c} selected={selected === c.id} onSelect={setSelected} status="shipped" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="col-span-7">
        {applying === selected ? <LoadingDetail c={current} /> : (
          <ClusterDetail c={current} justShipped={!!shipped[selected]} onApply={apply} onRollback={rollback} annotated={annotated} trialDay={trialDay} />
        )}
      </div>
    </div>
  );
}

/* ============================== SCORECARD ============================== */

function Scorecard({ trialDay, annotated }: { trialDay: number; annotated: boolean }) {
  const snap = SNAPSHOT[trialDay];
  const data = SLOPE.slice(0, trialDay + 1);
  const events = TIMELINE.filter((e) => e.day <= trialDay);
  const monthlyDeflectedDelta = Math.round((snap.monthlyVolume * (snap.deflection - 38)) / 100);
  const annualROI = Math.round(monthlyDeflectedDelta * 12 * snap.costPerTicket);
  const last = data[data.length - 1];

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trial trajectory · day {trialDay} of 30</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-3xl font-bold text-emerald-700 tabular-nums flex items-center">+{snap.slopePerWeek} pts / wk{annotated && <NBadge n={1} />}</div>
              <span className="text-sm font-medium text-slate-500">deflection</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Headline is rate of improvement, not level. Current deflection: {snap.deflection}% · containment: {snap.containment}%.</div>
          </div>
          <Pill className="text-slate-700 bg-slate-50 border-slate-200 shrink-0">
            <Lock className="w-3 h-3" />Deflection = no repeat contact within 5 days
            {annotated && <NBadge n={4} />}
          </Pill>
        </div>
        <div className="h-56 -ml-2">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(d) => `D${d}`} fontSize={11} stroke="#64748b" />
              <YAxis fontSize={11} stroke="#64748b" domain={[30, 80]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                labelFormatter={(d) => `Trial day ${d}`}
                formatter={((v: number, n: string) => [`${v}%`, n]) as never}
              />
              <Line type="monotone" dataKey="deflection"  stroke="#4f46e5" strokeWidth={2.5} dot={false} name="Deflection (resolved)" />
              <Line type="monotone" dataKey="containment" stroke="#94a3b8" strokeWidth={2}   strokeDasharray="5 4" dot={false} name="Containment (no handoff)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between text-xs mt-2 ml-2 flex-wrap gap-2">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-600" />Deflection · resolved</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-slate-400" />Containment · no handoff{annotated && <NBadge n={2} />}</span>
          </div>
          <div className="text-slate-500">CSAT (latest survey wave): <span className="font-semibold text-slate-900 tabular-nums">{snap.csat.toFixed(2)} ★</span> · n={last.csatN}{annotated && <NBadge n={3} />}</div>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 flex flex-col">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-1">Projected annualized savings</div>
        <div className="text-3xl font-bold text-indigo-900 tabular-nums">${(annualROI / 1000).toFixed(0)}K<span className="text-sm font-medium text-indigo-700 ml-1">/ yr</span></div>
        <div className="text-xs text-slate-600 mt-2 leading-relaxed">
          {monthlyDeflectedDelta.toLocaleString()} more conversations deflected per month vs. baseline · ${snap.costPerTicket.toFixed(2)} avg cost per ticket · {snap.monthlyVolume.toLocaleString()} monthly volume.
          {annotated && <NBadge n={6} />}
        </div>
        <div className="mt-auto pt-4">
          <button className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold border border-indigo-300 bg-white text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-50 transition">
            Export buyer one-pager <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center">Attributed improvement timeline{annotated && <NBadge n={5} />}</div>
            <div className="text-sm text-slate-700">Every lift links to the Workbench cluster that produced it — story is traceable, not vibes.</div>
          </div>
        </div>
        <div className="space-y-1">
          {events.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No fixes shipped yet — timeline populates as the operator works through the Workbench.</div>
          ) : events.map((e) => (
            <div key={e.day} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="w-14 text-xs font-semibold text-slate-500 tabular-nums pt-0.5">Day {e.day}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 font-medium">{e.action}</div>
                <div className="text-xs text-slate-500">{e.intent} · {e.owner}{e.clusterId && <> · linked to <span className="text-indigo-700 font-medium">{e.name}</span></>}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums shrink-0">
                {'deflectionLift' in e && e.deflectionLift && <span className="text-emerald-700">+{e.deflectionLift} pts deflection</span>}
                {'csatLift' in e && e.csatLift && <span className="text-emerald-700">+{e.csatLift} CSAT</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== APP SHELL ============================== */

export default function App() {
  const [tab, setTab] = useState<'workbench' | 'scorecard'>('workbench');
  const [trialDay, setTrialDay] = useState<number>(7);
  const [annotated, setAnnotated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">D</div>
            <div className="font-semibold tracking-tight">Hillclimbing</div>
            <Pill className="text-slate-600 bg-slate-100 border-slate-200">Acme Apparel · Trial</Pill>
            <a href={DATASET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border text-slate-500 bg-white border-slate-200 hover:text-indigo-700 hover:border-indigo-200 transition" title="Conversation samples adapted from this public dataset">
              <Database className="w-3 h-3" />data: strova-ai/customer_support_conversations_dataset
            </a>
          </div>
          <nav className="ml-6 flex gap-1">
            <TabButton active={tab === 'workbench'} onClick={() => setTab('workbench')}>Workbench</TabButton>
            <TabButton active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>Scorecard</TabButton>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
              {[7, 21].map((d) => (
                <button key={d} onClick={() => setTrialDay(d)} className={`px-2.5 py-1 rounded transition ${trialDay === d ? 'bg-white shadow-sm font-semibold text-slate-900' : 'text-slate-600'}`}>
                  Day {d}
                </button>
              ))}
            </div>
            <button onClick={() => setAnnotated(!annotated)} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition ${annotated ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {annotated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Annotations {annotated ? 'on' : 'off'}
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-6 py-6 transition-all ${annotated ? 'pr-[340px]' : ''}`}>
        {tab === 'workbench' ? <Workbench trialDay={trialDay} annotated={annotated} /> : <Scorecard trialDay={trialDay} annotated={annotated} />}
      </main>

      {annotated && (
        <aside className="fixed top-14 right-0 bottom-0 w-[320px] border-l border-slate-200 bg-white p-5 overflow-y-auto z-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />Thesis annotations · {tab}
          </div>
          <ol className="space-y-3">
            {ANNOTATIONS[tab].map((a) => (
              <li key={a.n} className="flex gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400 text-amber-950 text-xs font-bold grid place-items-center mt-0.5">{a.n}</span>
                <span className="text-xs text-slate-700 leading-relaxed">{a.t}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
