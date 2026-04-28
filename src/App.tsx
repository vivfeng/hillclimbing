// Conversation transcripts and failure-cluster patterns adapted from the
// strova-ai/customer_support_conversations_dataset (HuggingFace, public),
// then re-clustered into the why × where structure used by the Workbench.
// Volume / containment / deflection numbers are illustrative for the prototype.
// Source: https://huggingface.co/datasets/strova-ai/customer_support_conversations_dataset

import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, Brain, Shield, Wrench, RotateCcw, Lock, Eye, EyeOff, Check,
  Loader2, ChevronRight, ChevronLeft, Sparkles, ArrowUpRight, Inbox, AlertTriangle,
  Filter, Database, Play, X, Clock, Send,
} from 'lucide-react';

const DATASET_URL = 'https://huggingface.co/datasets/strova-ai/customer_support_conversations_dataset';

/* ============================== FIXTURES ============================== */

const WHY = {
  knowledge: { label: 'Knowledge', icon: BookOpen, text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  reasoning: { label: 'Reasoning', icon: Brain,    text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  policy:    { label: 'Policy',    icon: Shield,   text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  tool:      { label: 'Tool',      icon: Wrench,   text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const CLUSTERS = [
  {
    id: 'c1', name: 'Extended return window confusion', intent: 'Refunds', why: 'knowledge',
    volumePerDay: 142, containment: 71, deflection: 44, csatDrag: -0.31,
    projectedLift: 4.2, projectedLiftRange: [3.5, 4.8] as [number, number],
    confidence: 0.34, source: 'imported',
    primarySignal: { label: 'rephrase rate', trend7d: [16, 17, 18, 20, 21, 23, 25] },
    gap: '"I don\'t have information about extended return windows" + 14 paraphrases — 89 conversations / wk',
    transcripts: [
      { u: 'I bought a sweater on Black Friday and need to return it. Site says holiday returns go through Jan 31?', a: "I don't have specific information about extended holiday return windows. Standard returns are 30 days. Would you like to be transferred?" },
      { u: 'Your email said I had until February to return this. What is the actual policy?', a: "Our standard return policy is 30 days. I'm not sure about extended periods. Let me transfer you." },
      { u: 'Trying to understand the return window for gifts', a: "Returns must be initiated within 30 days. I don't have details on gift-specific or extended return windows." },
    ],
    action: 'Add extended-returns policy article to KB (covers holiday window + gift returns)',
    owner: 'Docs',
    actionType: 'direct' as const, actionVerb: 'Publish to KB',
    actionMicro: 'Publishes to the agent KB. Picked up on the next conversation. Validation in ~4h.',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 4, routedDay: null,
    validation: { rephraseRate: -38, escalationRate: -42, repeatRate48h: -29, csat: { delta: 0.6, n: 47 } },
  },
  {
    id: 'c2', name: 'Promo code stacking error', intent: 'Promotions', why: 'reasoning',
    volumePerDay: 98, containment: 64, deflection: 31, csatDrag: -0.42,
    projectedLift: 3.1, projectedLiftRange: [2.4, 3.8] as [number, number],
    confidence: 0.41, source: 'imported',
    primarySignal: { label: 'mid-flow escalation', trend7d: [22, 22, 24, 25, 26, 28, 31] },
    gap: 'Agent applies non-stackable codes then silently reverses one — 61 conversations / wk',
    transcripts: [
      { u: 'I have SPRING20 and FRIENDS15 — can I use both?', a: 'Yes, both are valid. Applying… Actually, FRIENDS15 was removed. Your total is now $84.99.' },
      { u: 'Why did the discount change at checkout?', a: 'Codes were re-evaluated. Only one promotional code may apply per order.' },
    ],
    action: 'Add stacking-rules pre-check to agent prompt before quoting any total',
    owner: 'Agent Config',
    actionType: 'direct' as const, actionVerb: 'Deploy prompt change',
    actionMicro: 'Deploys to 100% of Promotions traffic. Validation in ~4h.',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 6, routedDay: null,
    validation: { rephraseRate: -22, escalationRate: -31, repeatRate48h: -18, csat: { delta: 0.4, n: 32 } },
  },
  {
    id: 'c3', name: 'Order tracking lookup timeout', intent: 'Order status', why: 'tool',
    volumePerDay: 124, containment: 58, deflection: 22, csatDrag: -0.55,
    projectedLift: 5.1, projectedLiftRange: [4.2, 6.1] as [number, number],
    confidence: 0.28, source: 'native',
    primarySignal: { label: 'escalation rate', trend7d: [58, 60, 63, 67, 70, 71, 73] },
    gap: 'Carrier API times out at 8s; agent escalates 73% of timeout cases — 91 conversations / wk',
    transcripts: [
      { u: "Where's my order #4471892?", a: "I'm having trouble looking that up right now. Let me connect you with someone who can help." },
      { u: 'Can you check tracking on order 4470229?', a: 'Looking that up… I am unable to retrieve tracking details at this time.' },
    ],
    action: 'Raise carrier-API timeout to 15s + add cached-tracking fallback for last-known status',
    owner: 'Engineering',
    actionType: 'routed' as const, actionVerb: 'Send to Engineering',
    actionMicro: 'Engineering reviews + ships the timeout/fallback. Validation appears here once it lands. Typical SLA: 3–5 days.',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 12, routedDay: 8,
    validation: { rephraseRate: -8, escalationRate: -64, repeatRate48h: -41, csat: { delta: 0.7, n: 58 } },
  },
  {
    id: 'c4', name: 'Subscription pause not honored', intent: 'Subscriptions', why: 'policy',
    volumePerDay: 67, containment: 52, deflection: 28, csatDrag: -0.61,
    projectedLift: 2.4, projectedLiftRange: [1.8, 3.0] as [number, number],
    confidence: 0.39, source: 'native',
    primarySignal: { label: '48h repeat', trend7d: [38, 40, 41, 43, 45, 46, 49] },
    gap: 'Pause requested mid-cycle still ships next box — policy ambiguous on cutoff — 48 conv / wk',
    transcripts: [
      { u: 'I paused my subscription last week and got charged again this morning?', a: 'Pauses take effect at the next billing cycle. Your charge was already processed.' },
      { u: 'I clearly clicked pause on the 12th. Why am I being shipped today?', a: 'Pause requests apply to future cycles, not the current one.' },
    ],
    action: 'Decision needed → Subscription PM: define pause cutoff window relative to ship date',
    owner: 'Policy (Subs PM)',
    actionType: 'routed' as const, actionVerb: 'Send to Subs PM',
    actionMicro: 'Subs PM decides on cutoff window. You\'ll see status updates here. Typical SLA: 2 days for ack, ~1 week for resolution.',
    statusByDay: { 7: 'routed', 21: 'routed' }, shippedDay: null, routedDay: 5,
    validation: null,
  },
  {
    id: 'c5', name: 'Address change after carrier handoff', intent: 'Shipping', why: 'policy',
    volumePerDay: 54, containment: 49, deflection: 19, csatDrag: -0.48,
    projectedLift: 1.8, projectedLiftRange: [1.3, 2.4] as [number, number],
    confidence: 0.43, source: 'native',
    primarySignal: { label: '48h repeat', trend7d: [22, 24, 24, 25, 27, 28, 29] },
    gap: 'Agents promise address changes after pickup — operationally impossible — 36 conv / wk',
    transcripts: [
      { u: 'I need to change the delivery address on order 4468121', a: "I can update that for you. What's the new address?" },
      { u: "Update didn't go through — package shipped to old address", a: 'Once the carrier picks up, address changes need to go through them directly.' },
    ],
    action: 'Update prompt: check shipment status before promising address change; escalate if shipped',
    owner: 'Agent Config',
    actionType: 'direct' as const, actionVerb: 'Deploy prompt change',
    actionMicro: 'Deploys to 100% of Shipping traffic. Validation in ~4h.',
    statusByDay: { 7: 'open', 21: 'open' }, shippedDay: null, routedDay: null,
    validation: null,
  },
  {
    id: 'c6', name: 'Loyalty points expiration unclear', intent: 'Account', why: 'knowledge',
    volumePerDay: 41, containment: 76, deflection: 51, csatDrag: -0.18,
    projectedLift: 0.8, projectedLiftRange: [0.5, 1.1] as [number, number],
    confidence: 0.52, source: 'native',
    primarySignal: { label: 'rephrase rate', trend7d: [12, 13, 12, 13, 14, 14, 15] },
    gap: 'Tier-specific expiration windows missing from KB — 27 conversations / wk',
    transcripts: [
      { u: 'When do my Gold tier points expire?', a: "Points generally expire 12 months after they're earned. I don't have tier-specific details." },
    ],
    action: 'Add tier-specific points-expiration table to KB',
    owner: 'Docs',
    actionType: 'direct' as const, actionVerb: 'Publish to KB',
    actionMicro: 'Publishes to the agent KB. Picked up on the next conversation. Validation in ~4h.',
    statusByDay: { 7: 'open', 21: 'shipped' }, shippedDay: 19, routedDay: null,
    validation: { rephraseRate: -19, escalationRate: -24, repeatRate48h: -16, csat: { delta: 0.3, n: 14 } },
  },
];

// The trial trajectory is built from three additive parts:
//   1. Baseline (day 0 = no AI hill-climbing yet).
//   2. Cumulative effect of shipped fixes (matches TIMELINE), with linear
//      ramp-in over ~3 days as each fix takes effect across live conversations.
//   3. Small natural drift (operator + agent learning each day).
// SNAPSHOT levels and the headline slope are then read directly off this
// curve, so the chart line, the headline number, and the ROI all share a
// single source of truth.
const BASELINE = { deflection: 38, containment: 64, csat: 3.40 };
const DRIFT_PER_DAY = { deflection: 0.34, containment: 0.20, csat: 0.012 };

const SHIPMENTS = [
  { day: 4,  deflection: 3.8, containment: 1.5, csat: 0.05 },
  { day: 6,  deflection: 2.1, containment: 0.8, csat: 0.04 },
  { day: 9,  deflection: 0,   containment: 0.5, csat: 0.04 },
  { day: 12, deflection: 5.1, containment: 2.0, csat: 0.07 },
  { day: 16, deflection: 1.4, containment: 0.6, csat: 0.03 },
  { day: 19, deflection: 0.8, containment: 0.4, csat: 0.02 },
];

// 30% on ship day, +25%/day, full effect by ship day + 3
function rampFraction(dayDelta: number): number {
  if (dayDelta < 0) return 0;
  return Math.min(1, 0.3 + dayDelta * 0.25);
}

function curveAt(day: number) {
  const lifts = SHIPMENTS.reduce((acc, s) => {
    const f = rampFraction(day - s.day);
    return {
      deflection:  acc.deflection  + f * s.deflection,
      containment: acc.containment + f * s.containment,
      csat:        acc.csat        + f * s.csat,
    };
  }, { deflection: 0, containment: 0, csat: 0 });
  return {
    deflection:  BASELINE.deflection  + day * DRIFT_PER_DAY.deflection  + lifts.deflection,
    containment: BASELINE.containment + day * DRIFT_PER_DAY.containment + lifts.containment,
    csat:        BASELINE.csat        + day * DRIFT_PER_DAY.csat        + lifts.csat,
  };
}

const SLOPE = (() => {
  const out: { day: number; deflection: number; containment: number; csat: number; csatN: number }[] = [];
  for (let d = 0; d <= 30; d++) {
    const c = curveAt(d);
    out.push({
      day: d,
      deflection:  +c.deflection.toFixed(2),
      containment: +c.containment.toFixed(2),
      csat:        +c.csat.toFixed(3),
      csatN: 6 + Math.floor(d * 1.1),
    });
  }
  return out;
})();

// 7 calendar days = last 8 daily readings (days t-7 .. t).
const ROLLING_WINDOW_DAYS = 7;
function rollingDeflectionRegression(end: number) {
  const start = Math.max(0, end - ROLLING_WINDOW_DAYS);
  const slice = SLOPE.slice(start, end + 1);
  const n = slice.length;
  if (n < 3) return { slopePerWeek: 0, slopeCI: 0 };
  const xMean = slice.reduce((s, p) => s + p.day, 0) / n;
  const yMean = slice.reduce((s, p) => s + p.deflection, 0) / n;
  let num = 0, den = 0;
  for (const p of slice) {
    num += (p.day - xMean) * (p.deflection - yMean);
    den += (p.day - xMean) ** 2;
  }
  const slopePerDay = num / den;
  let sse = 0;
  for (const p of slice) {
    const yPred = yMean + slopePerDay * (p.day - xMean);
    sse += (p.deflection - yPred) ** 2;
  }
  const seSlope = Math.sqrt(sse / Math.max(1, n - 2)) / Math.sqrt(den);
  const z80 = 1.282;
  return {
    slopePerWeek: +(slopePerDay * 7).toFixed(1),
    slopeCI:      +(z80 * seSlope * 7).toFixed(1),
  };
}

function getSnapshot(day: number) {
  const p = SLOPE[day];
  const reg = rollingDeflectionRegression(day);
  return {
    deflection:    +p.deflection.toFixed(1),
    containment:   +p.containment.toFixed(1),
    csat:          +p.csat.toFixed(2),
    csatN:         p.csatN,
    slopePerWeek:  reg.slopePerWeek,
    slopeCI:       reg.slopeCI,
    monthlyVolume: 47200,
    costPerTicket: 8.50,
  };
}

const TIMELINE = [
  { day: 4,  clusterId: 'c1', name: 'Extended return window confusion', action: 'Added KB article on holiday + gift return windows',  deflectionLift: 3.8, intent: 'Refunds',     owner: 'Docs' },
  { day: 6,  clusterId: 'c2', name: 'Promo code stacking error',         action: 'Added stacking-rules pre-check to agent prompt',     deflectionLift: 2.1, intent: 'Promotions',  owner: 'Agent Config' },
  { day: 9,  clusterId: null, name: 'Billing escalation threshold',      action: 'Lowered confidence threshold for billing handoffs',  csatLift: 0.4,       intent: 'Billing',     owner: 'Agent Config' },
  { day: 12, clusterId: 'c3', name: 'Order tracking timeout',            action: 'Raised carrier API timeout + cached fallback',       deflectionLift: 5.1, intent: 'Order status',owner: 'Engineering' },
  { day: 16, clusterId: null, name: 'BOPIS pickup window mismatch',      action: 'Synced fulfillment window doc with store ops',       deflectionLift: 1.4, intent: 'Fulfillment', owner: 'Docs' },
  { day: 19, clusterId: 'c6', name: 'Loyalty points expiration',         action: 'Added tier-specific expiration table',               deflectionLift: 0.8, intent: 'Account',     owner: 'Docs' },
] as const;


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

type TourState = { tab: 'workbench' | 'scorecard'; trialDay: number; selected: string; annotated: boolean };
const TOUR: { title: string; body: string; state: TourState }[] = [
  {
    title: 'The Workbench',
    body: 'Failure clusters are ranked by impact and uncertainty (volume × low confidence × bad outcome). Top of list auto-selected — your morning starts here.',
    state: { tab: 'workbench', trialDay: 7, selected: 'c1', annotated: false },
  },
  {
    title: 'Steering signals, not just confirmation',
    body: 'Each open cluster card shows a 7-day sparkline of its primary implicit signal. c3 (Order tracking) is trending up — getting worse fast — which is why it earns a top spot in the queue.',
    state: { tab: 'workbench', trialDay: 7, selected: 'c3', annotated: false },
  },
  {
    title: 'Diagnose → propose → ship',
    body: 'On the right: representative transcripts, an auto-detected gap, and a recommended action with projected lift as a range (80% CI), routed to the right internal owner. One click to apply.',
    state: { tab: 'workbench', trialDay: 7, selected: 'c1', annotated: false },
  },
  {
    title: 'Time-shift to Day 21',
    body: 'Four fixes have shipped. Each shipped cluster carries a measured before/after band with a confidence badge tied to sample size (high · medium · low).',
    state: { tab: 'workbench', trialDay: 21, selected: 'c1', annotated: false },
  },
  {
    title: 'The buyer\'s artifact',
    body: 'Headline: +5.3 ±0.3 pts/wk — rate, not level. Deflection definition locked at trial start. Timeline lifts link back to source clusters. ROI projected from current level vs. baseline.',
    state: { tab: 'scorecard', trialDay: 21, selected: 'c1', annotated: false },
  },
  {
    title: 'Read the thesis callouts',
    body: 'Annotations are now on. 14 numbered callouts tie individual UI elements back to specific arguments in the case study — 8 on the Workbench, 6 on the Scorecard. Toggle any time from the header.',
    state: { tab: 'workbench', trialDay: 21, selected: 'c1', annotated: true },
  },
];

/* ============================== HELPERS ============================== */

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${className}`}>{children}</span>;
}

function NBadge({ n, show = true }: { n: number; show?: boolean }) {
  if (!show) return null;
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold ring-2 ring-white ml-1 shrink-0">{n}</span>;
}

function Stat({ label, sub, value, accent = false, negative = false, badge }: { label: string; sub: string; value: React.ReactNode; accent?: boolean; negative?: boolean; badge?: React.ReactNode }) {
  return (
    <div className={`relative rounded-lg border ${accent ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'} p-3`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center">{label}</div>
      <div className={`text-2xl font-bold tabular-nums mt-0.5 ${accent ? 'text-blue-700' : negative ? 'text-rose-700' : 'text-slate-900'}`}>{value}</div>
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

function Sparkline({ data, w = 56, h = 16 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const last = data[data.length - 1];
  const first = data[0];
  const dir = last > first ? 'up' : last < first ? 'down' : 'flat';
  // For implicit signals (rephrase / escalation / repeat), up == worse → rose
  const stroke = dir === 'up' ? '#e11d48' : dir === 'down' ? '#059669' : '#64748b';
  const lastY = h - ((last - min) / range) * h;
  return (
    <svg width={w} height={h} className="overflow-visible shrink-0" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth={1.5} points={pts} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r={2} fill={stroke} />
    </svg>
  );
}

function trendDelta(trend7d: number[]) {
  const first = trend7d[0];
  const last = trend7d[trend7d.length - 1];
  const dir = last > first ? 'up' : last < first ? 'down' : 'flat';
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
  // up = worse → rose; down = better → emerald
  const cls = dir === 'up' ? 'text-rose-700' : dir === 'down' ? 'text-emerald-700' : 'text-slate-500';
  return { first, last, dir, arrow, cls };
}

function fmtRange([lo, hi]: [number, number]) {
  return `+${lo}–${hi} pts`;
}

function confidenceLevel(n: number): { level: 'high' | 'medium' | 'low'; cls: string } {
  if (n >= 40) return { level: 'high',   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (n >= 20) return { level: 'medium', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  return        { level: 'low',    cls: 'text-slate-600 bg-slate-100 border-slate-200' };
}

/* ============================== WORKBENCH ============================== */

type Cluster = typeof CLUSTERS[number];

function ClusterCard({ c, selected, onSelect, status, badges }: { c: Cluster; selected: boolean; onSelect: (id: string) => void; status: 'open' | 'routed' | 'shipped'; badges?: { containment?: number; source?: number } }) {
  const w = WHY[c.why as keyof typeof WHY];
  const Icon = w.icon;
  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`w-full text-left rounded-lg border p-3 transition ${selected ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${w.bg} ${w.text} border ${w.border}`}>
          <Icon className="w-3 h-3" />{w.label}
        </span>
        <span className="text-[10px] font-medium text-slate-500">{c.intent}</span>
        {c.source === 'imported' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 bg-white border border-slate-200">
            <Sparkles className="w-3 h-3" />head-start
            {badges?.source && <NBadge n={badges.source} />}
          </span>
        )}
        {status === 'shipped' && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
            <Check className="w-3 h-3" />shipped
          </span>
        )}
        {status === 'routed' && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200">
            <Clock className="w-3 h-3" />awaiting {c.owner.split(' ')[0]}
          </span>
        )}
      </div>
      <div className="font-semibold text-sm text-slate-900 leading-snug">{c.name}</div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
        <div>
          <div className="text-slate-500">Volume</div>
          <div className="font-semibold tabular-nums text-slate-900">{c.volumePerDay}/d</div>
        </div>
        <div>
          <div className="text-slate-500">Containment</div>
          <div className="font-semibold tabular-nums text-slate-700">{c.containment}%</div>
        </div>
        <div>
          <div className="text-slate-500 flex items-center">Deflection{badges?.containment && <NBadge n={badges.containment} />}</div>
          <div className="font-bold tabular-nums text-blue-700">{c.deflection}%</div>
        </div>
        <div>
          <div className="text-slate-500">Proj. lift</div>
          <div className="font-semibold tabular-nums text-emerald-700">{fmtRange(c.projectedLiftRange)}</div>
        </div>
      </div>
      {status === 'shipped' && c.validation && (
        <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center gap-1.5 text-[10px] flex-wrap">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
            <Check className="w-3 h-3" />Validated
          </span>
          <span className="text-slate-600 tabular-nums">
            rephrase {c.validation.rephraseRate}% · escalation {c.validation.escalationRate}% · CSAT +{c.validation.csat.delta}
          </span>
        </div>
      )}
      {status !== 'shipped' && c.primarySignal && (() => {
        const t = trendDelta(c.primarySignal.trend7d);
        return (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
            <Sparkline data={c.primarySignal.trend7d} />
            <div className="text-[10px] leading-tight">
              <div className={`font-semibold tabular-nums ${t.cls}`}>{t.arrow} {c.primarySignal.label} {t.last}%</div>
              <div className="text-slate-500">7d trend · was {t.first}%</div>
            </div>
          </div>
        );
      })()}
    </button>
  );
}

function ValidationBand({ validation, optimistic = false, badge }: { validation: any; optimistic?: boolean; badge?: React.ReactNode }) {
  if (!validation) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-500 flex items-center gap-2">
        <Inbox className="w-4 h-4" />
        Validation appears here ~4h after a fix ships.
      </div>
    );
  }
  const items = [
    { label: 'Rephrase rate',           value: validation.rephraseRate, suffix: '%', good: 'down' },
    { label: 'Mid-flow escalations',    value: validation.escalationRate, suffix: '%', good: 'down' },
    { label: '48h repeat contact',      value: validation.repeatRate48h, suffix: '%', good: 'down' },
    { label: `CSAT survey (n=${validation.csat.n || '—'})`, value: validation.csat.delta, suffix: ' ★', good: 'up' },
  ];
  const conf = confidenceLevel(optimistic ? 0 : (validation.csat.n || 0));
  return (
    <div className={`rounded-lg border ${optimistic ? 'border-dashed border-slate-300 bg-slate-50' : 'border-emerald-200 bg-emerald-50/40'} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2">
          <span className="flex items-center">{optimistic ? 'Projected — validating' : 'Measured — implicit signals + CSAT'}{badge}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${conf.cls} normal-case tracking-normal`}>
            confidence: {conf.level}{!optimistic && ` · n=${validation.csat.n}`}
          </span>
        </div>
        {optimistic && <span className="text-[10px] text-slate-500">first reading expected in ~4h</span>}
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
  const direct = c.actionType === 'direct';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
      <div className="text-sm font-semibold text-slate-900">{direct ? 'Shipping fix to production…' : `Routing to ${c.owner}…`}</div>
      <div className="text-xs text-slate-500 mt-1">
        {direct
          ? `Versioning edit · enabling for 100% of ${c.intent} traffic`
          : `Sending cluster context + recommended action`}
      </div>
      <div className="text-xs text-slate-400 mt-3">{direct ? 'Implicit-signal validation typically appears in 2–4 hours.' : `Typical SLA: ${c.actionType === 'routed' ? '2–5 days for resolution.' : ''}`}</div>
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

function ClusterDetail({ c, status, justActed, onApply, onCancel, annotated, trialDay }: { c: Cluster; status: ClusterStatus; justActed: boolean; onApply: (id: string) => void; onCancel: (id: string) => void; annotated: boolean; trialDay: number }) {
  if (!c) return <EmptyDetail />;
  const w = WHY[c.why as keyof typeof WHY];
  const Icon = w.icon;
  const isShipped = status === 'shipped';
  const isRouted = status === 'routed';
  const isOpen = status === 'open';
  const dayShipped = c.statusByDay[trialDay as 7 | 21] === 'shipped';
  const validation = c.validation ?? (isShipped && justActed ? estimateValidation(c) : null);
  const direct = c.actionType === 'direct';
  const ActionIcon = direct ? ChevronRight : Send;

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
              <Pill className="text-slate-700 bg-slate-100 border-slate-200">
                <Sparkles className="w-3 h-3" />head-start library
              </Pill>
            )}
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{c.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Containment" sub="No-handoff rate" value={`${c.containment}%`} />
        <Stat label="Deflection" sub="Resolved without repeat" value={`${c.deflection}%`} accent badge={annotated ? <NBadge n={1} /> : null} />
        <Stat label="Volume" sub="Conversations / day" value={c.volumePerDay} />
        <Stat label="CSAT drag" sub="Effect on overall CSAT" value={c.csatDrag.toFixed(2)} negative />
      </div>

      <Section title="Representative transcripts" subtitle={`${c.transcripts.length} of ~${Math.round(c.volumePerDay * 7 * 0.4)} weekly samples`}>
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

      <div className="rounded-lg border-l-2 border-l-slate-900 border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-0.5 flex items-center">Auto-detected gap{annotated && <NBadge n={5} />}</div>
            <div className="text-sm text-slate-900">{c.gap}</div>
          </div>
        </div>
      </div>

      <Section title="Recommended action" badge={annotated ? <NBadge n={6} /> : null}>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900 mb-1">{c.action}</div>
              <div className="text-xs text-slate-600">
                {direct ? 'Owned by' : 'Routes to'} <span className="font-semibold text-slate-900">{c.owner}</span> · projected <span className="font-semibold text-emerald-700">{fmtRange(c.projectedLiftRange)} deflection on {c.intent}</span> <span className="text-slate-400">(80% CI)</span>
              </div>
              {isOpen && (
                <div className="mt-2 text-xs text-slate-500 border-t border-blue-100 pt-2">{c.actionMicro}</div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 items-end shrink-0">
              {isOpen && (
                <button onClick={() => onApply(c.id)} className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3 py-1.5 rounded-md hover:bg-blue-700 transition">
                  {c.actionVerb} <ActionIcon className="w-4 h-4" />
                </button>
              )}
              {isRouted && (
                <>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-md border border-slate-200">
                    <Clock className="w-4 h-4" />Awaiting {c.owner.split(' ')[0]} · day {c.routedDay ?? trialDay}
                  </span>
                  <button onClick={() => onCancel(c.id)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition">
                    <X className="w-3 h-3" />cancel routing
                  </button>
                </>
              )}
              {isShipped && (
                <>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-sm font-semibold px-3 py-1.5 rounded-md border border-emerald-200">
                    <Check className="w-4 h-4" />Shipped {justActed && !dayShipped ? 'just now' : `day ${c.shippedDay}`}
                  </span>
                  <button onClick={() => onCancel(c.id)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 transition">
                    <RotateCcw className="w-3 h-3" />rollback v{23 + (c.id.charCodeAt(1) % 9)}
                    {annotated && <NBadge n={8} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      {isRouted ? (
        <Section title="Routing status" subtitle={`sent to ${c.owner} · awaiting decision`}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">Sent day {c.routedDay ?? trialDay} · Acknowledged by {c.owner} day {(c.routedDay ?? trialDay) + 1}</div>
                <div className="text-xs text-slate-600 mt-1">{c.actionMicro}</div>
                <div className="text-xs text-slate-500 mt-3 inline-flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Validation populates here once the owner ships.
                </div>
              </div>
            </div>
          </div>
        </Section>
      ) : (
        <Section title="Before / after" subtitle="implicit signals + CSAT confirmation">
          <ValidationBand validation={validation} optimistic={isShipped && justActed && !c.validation} badge={annotated ? <NBadge n={7} /> : null} />
        </Section>
      )}
    </div>
  );
}

type ClusterStatus = 'open' | 'routed' | 'shipped';

function Workbench({ trialDay, annotated, selected, setSelected }: { trialDay: number; annotated: boolean; selected: string; setSelected: (id: string) => void }) {
  const [whyFilter, setWhyFilter] = useState<string>('all');
  const [actions, setActions] = useState<Record<string, 'shipped' | 'routed'>>({});
  const [applying, setApplying] = useState<string | null>(null);

  const visible = useMemo(() => CLUSTERS.filter((c) => whyFilter === 'all' || c.why === whyFilter), [whyFilter]);
  const getStatus = (c: Cluster): ClusterStatus => actions[c.id] ?? (c.statusByDay[trialDay as 7 | 21] as ClusterStatus);
  const open      = visible.filter((c) => getStatus(c) === 'open').sort((a, b) => b.volumePerDay * (1 - b.confidence) - a.volumePerDay * (1 - a.confidence));
  const inFlight  = visible.filter((c) => getStatus(c) === 'routed');
  const shippedList = visible.filter((c) => getStatus(c) === 'shipped');

  // When the active filter would hide the currently-selected cluster, jump
  // the detail panel to the first cluster that's still visible.
  useEffect(() => {
    if (visible.some((c) => c.id === selected)) return;
    const next = visible[0];
    if (next) setSelected(next.id);
  }, [whyFilter, selected, visible, setSelected]);

  // Always-visible status strip; numbers swap on Day 7 ⇄ Day 21 toggle so a
  // reviewer toggling back and forth feels the trial progress directly.
  const snap = getSnapshot(trialDay);
  const allShipped = CLUSTERS.filter((c) => getStatus(c) === 'shipped').length;
  const allOpen    = CLUSTERS.filter((c) => getStatus(c) === 'open').length;
  const allFlight  = CLUSTERS.filter((c) => getStatus(c) === 'routed').length;
  const day7Snap = getSnapshot(7);

  const current = CLUSTERS.find((c) => c.id === selected) as Cluster;

  const apply = (id: string) => {
    const c = CLUSTERS.find((x) => x.id === id);
    if (!c) return;
    const next: 'shipped' | 'routed' = c.actionType === 'direct' ? 'shipped' : 'routed';
    setApplying(id);
    setTimeout(() => {
      setActions((s) => ({ ...s, [id]: next }));
      setApplying(null);
    }, c.actionType === 'direct' ? 1300 : 800);
  };
  const cancel = (id: string) => {
    setActions((s) => { const n = { ...s }; delete n[id]; return n; });
  };

  const filters = [
    { id: 'all', label: 'All', count: CLUSTERS.length },
    ...Object.keys(WHY).map((k) => ({ id: k, label: WHY[k as keyof typeof WHY].label, count: CLUSTERS.filter((c) => c.why === k).length })),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-4 text-xs text-slate-600 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-900">Day {trialDay} of 30</span>
          <span className="text-slate-300">·</span>
          <span><span className="font-semibold tabular-nums text-emerald-700">{allShipped}</span> shipped</span>
          <span><span className="font-semibold tabular-nums text-slate-700">{allFlight}</span> in flight</span>
          <span><span className="font-semibold tabular-nums text-slate-700">{allOpen}</span> open</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span>slope <span className="font-semibold tabular-nums text-emerald-700">+{snap.slopePerWeek}</span> <span className="text-slate-400">±{snap.slopeCI}</span> pts/wk</span>
          <span className="text-slate-300">·</span>
          <span>deflection <span className="font-semibold tabular-nums text-blue-700">{snap.deflection}%</span></span>
          {trialDay === 21 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border text-emerald-700 bg-emerald-50 border-emerald-200">
              +{(snap.deflection - day7Snap.deflection).toFixed(1)} pts vs Day 7 · CI {day7Snap.slopeCI > 0 ? `${(day7Snap.slopeCI / snap.slopeCI).toFixed(1)}× tighter` : 'tightening'}
            </span>
          )}
        </div>
      </div>
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

        {inFlight.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" />In flight · {inFlight.length} awaiting owner{inFlight.length === 1 ? '' : 's'}
            </div>
            <div className="space-y-2">
              {inFlight.map((c) => (
                <ClusterCard key={c.id} c={c} selected={selected === c.id} onSelect={setSelected} status="routed" />
              ))}
            </div>
          </div>
        )}

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
          <ClusterDetail c={current} status={getStatus(current)} onApply={apply} onCancel={cancel} annotated={annotated} trialDay={trialDay} justActed={!!actions[selected]} />
        )}
      </div>
      </div>
    </div>
  );
}

/* ============================== SCORECARD ============================== */

function Scorecard({ trialDay, annotated, onNavigateToCluster }: { trialDay: number; annotated: boolean; onNavigateToCluster: (id: string) => void }) {
  const snap = getSnapshot(trialDay);
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
              <div className="text-3xl font-bold text-emerald-700 tabular-nums flex items-baseline gap-1.5">
                +{snap.slopePerWeek}
                <span className="text-lg font-semibold text-emerald-700/70">±{snap.slopeCI}</span>
                <span className="text-base font-medium text-slate-500">pts / wk</span>
                {annotated && <NBadge n={1} />}
                <span className="text-base font-medium text-slate-500">deflection</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">Headline is rate of improvement, not level. 80% CI from 7-day rolling regression on the deflection series. Current deflection: {snap.deflection}% · containment: {snap.containment}%.</div>
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
              <Line type="monotone" dataKey="deflection"  stroke="#2563eb" strokeWidth={2.5} dot={false} name="Deflection (resolved)" />
              <Line type="monotone" dataKey="containment" stroke="#94a3b8" strokeWidth={2}   strokeDasharray="5 4" dot={false} name="Containment (no handoff)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between text-xs mt-2 ml-2 flex-wrap gap-2">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-600" />Deflection · resolved</span>
            <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-slate-400" />Containment · no handoff{annotated && <NBadge n={2} />}</span>
          </div>
          <div className="text-slate-500">CSAT (latest survey wave): <span className="font-semibold text-slate-900 tabular-nums">{snap.csat.toFixed(2)} ★</span> · n={last.csatN}{annotated && <NBadge n={3} />}</div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 flex flex-col">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Projected annualized savings</div>
        <div className="text-3xl font-bold text-blue-900 tabular-nums">${(annualROI / 1000).toFixed(0)}K<span className="text-sm font-medium text-blue-700 ml-1">/ yr</span></div>
        <div className="text-xs text-slate-600 mt-2 leading-relaxed">
          {monthlyDeflectedDelta.toLocaleString()} more conversations deflected per month vs. baseline · ${snap.costPerTicket.toFixed(2)} avg cost per ticket · {snap.monthlyVolume.toLocaleString()} monthly volume.
          {annotated && <NBadge n={6} />}
        </div>
        <div className="mt-auto pt-4 relative group">
          <button
            disabled
            aria-disabled="true"
            title="Coming soon — would generate a one-page ROI summary for the economic buyer"
            className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold border border-dashed border-slate-300 bg-white/60 text-slate-500 px-3 py-2 rounded-md cursor-not-allowed"
          >
            Export buyer one-pager <ArrowUpRight className="w-4 h-4" />
          </button>
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition text-[11px] font-medium text-white bg-slate-900 px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
            Coming soon — generates a one-page ROI summary for the buyer
          </div>
        </div>
      </div>

      <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center">Attributed improvement timeline{annotated && <NBadge n={5} />}</div>
            <div className="text-sm text-slate-700">Every lift links to the Workbench cluster that produced it — so the story is auditable.</div>
          </div>
        </div>
        <div className="space-y-1">
          {events.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No fixes shipped yet — timeline populates as you ship from the Workbench.</div>
          ) : events.map((e) => (
            <div key={e.day} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="w-14 text-xs font-semibold text-slate-500 tabular-nums pt-0.5">Day {e.day}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 font-medium">{e.action}</div>
                <div className="text-xs text-slate-500">
                  {e.intent} · {e.owner}
                  {e.clusterId && (
                    <> · linked to{' '}
                      <button
                        onClick={() => onNavigateToCluster(e.clusterId as string)}
                        className="text-blue-700 font-medium hover:underline focus:underline focus:outline-none"
                        title="Open this cluster in the Workbench"
                      >
                        {e.name}
                      </button>
                    </>
                  )}
                </div>
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

/* ============================== ONBOARDING ============================== */

function WelcomeModal({ onTour, onClose }: { onTour: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md bg-slate-900 grid place-items-center text-white text-xs font-bold">D</div>
          <Pill className="text-slate-600 bg-slate-100 border-slate-200">Case-study prototype</Pill>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2 leading-tight">Decagon Hillclimbing — Acme Apparel trial, Day 7</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          You're an Acme Apparel ops lead triaging customer-support failures with your Decagon CSM. Trials are won on <span className="font-semibold text-slate-900">slope</span>, not level — so Hillclimbing is built around a find → fix → validate loop.
        </p>
        <div className="space-y-1.5 mb-5 text-sm">
          <div className="flex items-baseline gap-3"><span className="font-semibold text-slate-900 w-24 shrink-0">Workbench</span><span className="text-slate-600">the daily driver — ranked clusters, drill in, ship a fix, watch validation.</span></div>
          <div className="flex items-baseline gap-3"><span className="font-semibold text-slate-900 w-24 shrink-0">Scorecard</span><span className="text-slate-600">the buyer's artifact — slope chart, attributed timeline, projected ROI.</span></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onTour} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-md transition">
            <Play className="w-4 h-4" />Start the 60-second tour
          </button>
          <button onClick={onClose} className="text-sm font-medium text-slate-600 hover:text-slate-900">Skip</button>
        </div>
      </div>
    </div>
  );
}

function TourCard({ step, onPrev, onNext, onClose }: { step: number; onPrev: () => void; onNext: () => void; onClose: () => void }) {
  const s = TOUR[step];
  const total = TOUR.length;
  const isLast = step === total - 1;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(560px,calc(100vw-2rem))]">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 inline-flex items-center gap-1.5">
            <Play className="w-3 h-3" />Tour · step {step + 1} of {total}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="font-semibold text-slate-900 text-sm mb-1">{s.title}</div>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{s.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-xs font-medium text-slate-500 hover:text-slate-900 transition">End tour</button>
          <div className="flex gap-2">
            <button disabled={step === 0} onClick={onPrev} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <ChevronLeft className="w-3.5 h-3.5" />Previous
            </button>
            <button onClick={onNext} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white transition">
              {isLast ? 'Finish' : 'Next'}<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 h-0.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
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
  const [selected, setSelected] = useState<string>('c1');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('hillclimbing.welcomed')) setShowWelcome(true);
  }, []);

  const applyStep = (idx: number) => {
    const s = TOUR[idx].state;
    setTab(s.tab);
    setTrialDay(s.trialDay);
    setSelected(s.selected);
    setAnnotated(s.annotated);
  };
  const dismissWelcome = () => {
    if (typeof window !== 'undefined') localStorage.setItem('hillclimbing.welcomed', '1');
    setShowWelcome(false);
  };
  const navigateToCluster = (id: string) => {
    setTab('workbench');
    setSelected(id);
  };
  const startTour = () => { dismissWelcome(); setTourStep(0); applyStep(0); };
  const nextStep = () => {
    if (tourStep === null) return;
    if (tourStep >= TOUR.length - 1) { setTourStep(null); return; }
    const n = tourStep + 1; setTourStep(n); applyStep(n);
  };
  const prevStep = () => {
    if (tourStep === null || tourStep === 0) return;
    const p = tourStep - 1; setTourStep(p); applyStep(p);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-slate-900 grid place-items-center text-white text-xs font-bold tracking-tight">D</div>
            <div className="font-semibold tracking-tight">Hillclimbing</div>
            <Pill className="text-slate-600 bg-slate-100 border-slate-200">Acme Apparel · Trial</Pill>
            <a href={DATASET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border text-slate-500 bg-white border-slate-200 hover:text-blue-700 hover:border-blue-200 transition" title="Conversation samples adapted from this public dataset">
              <Database className="w-3 h-3" />data: strova-ai/customer_support_conversations_dataset
            </a>
          </div>
          <nav className="ml-6 flex gap-1">
            <TabButton active={tab === 'workbench'} onClick={() => setTab('workbench')}>Workbench</TabButton>
            <TabButton active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>Scorecard</TabButton>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={startTour} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition">
              <Play className="w-3 h-3" />Take tour
            </button>
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 text-xs">
              {[7, 21].map((d) => (
                <button key={d} onClick={() => setTrialDay(d)} className={`px-2.5 py-1 rounded transition ${trialDay === d ? 'bg-white shadow-sm font-semibold text-slate-900' : 'text-slate-600'}`}>
                  Day {d}
                </button>
              ))}
            </div>
            <button onClick={() => setAnnotated(!annotated)} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition ${annotated ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {annotated ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Annotations {annotated ? 'on' : 'off'}
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto w-full px-6 py-6 transition-all flex-1 ${annotated ? 'pr-[340px]' : ''}`}>
        {tab === 'workbench'
          ? <Workbench trialDay={trialDay} annotated={annotated} selected={selected} setSelected={setSelected} />
          : <Scorecard trialDay={trialDay} annotated={annotated} onNavigateToCluster={navigateToCluster} />}
      </main>

      <footer className={`border-t border-slate-200 bg-white transition-all ${annotated ? 'pr-[320px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-slate-500">
          <div>
            Made by{' '}
            <a href="https://vivfeng.github.io/portfolio/#projects" target="_blank" rel="noreferrer" className="font-semibold text-slate-700 hover:text-blue-700 transition">
              Vivian Feng
            </a>
            {' '}for the Decagon case study.
          </div>
          <a href="https://github.com/vivfeng/hillclimbing" target="_blank" rel="noreferrer" className="hover:text-slate-700 transition">source ↗</a>
        </div>
      </footer>

      {annotated && (
        <aside className="fixed top-14 right-0 bottom-0 w-[320px] border-l border-slate-200 bg-white p-5 overflow-y-auto z-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />Thesis annotations · {tab}
          </div>
          <ol className="space-y-3">
            {ANNOTATIONS[tab].map((a) => (
              <li key={a.n} className="flex gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold grid place-items-center mt-0.5">{a.n}</span>
                <span className="text-xs text-slate-700 leading-relaxed">{a.t}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {showWelcome && <WelcomeModal onTour={startTour} onClose={dismissWelcome} />}
      {tourStep !== null && <TourCard step={tourStep} onPrev={prevStep} onNext={nextStep} onClose={() => setTourStep(null)} />}
    </div>
  );
}
