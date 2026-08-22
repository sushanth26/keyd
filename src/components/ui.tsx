import Link from "next/link";
import { clsx } from "clsx";
import type { PropertyStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/domain/lifecycle";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("card p-5", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeTone: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-brand-100 text-brand-800",
  violet: "bg-violet-100 text-violet-800",
};

export function Badge({ tone = "slate", children }: { tone?: keyof typeof badgeTone; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTone[tone])}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<PropertyStatus, keyof typeof badgeTone> = {
  DRAFT: "slate",
  VERIFICATION_PENDING: "amber",
  NEEDS_ATTENTION: "red",
  READY_FOR_REVIEW: "violet",
  ACTIVE: "green",
  BUYER_INTEREST_RECEIVED: "blue",
  UNDER_CONTRACT: "blue",
  SOLD: "slate",
  PAUSED: "amber",
  WITHDRAWN: "slate",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function EmptyState({
  title,
  message,
  action,
  icon = "📭",
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-green-200 bg-green-50 text-green-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };
  return (
    <div className={clsx("rounded-lg border p-4 text-sm", tones[tone])} role={tone === "error" ? "alert" : undefined}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

/// Circular readiness/score ring, 0..100.
export function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 55 ? "#de911d" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-slate-900" fontSize={size / 3.6} fontWeight={700}>
        {score}
      </text>
    </svg>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}) {
  const cls = variant === "primary" ? "btn-primary" : variant === "secondary" ? "btn-secondary" : "btn-ghost";
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
