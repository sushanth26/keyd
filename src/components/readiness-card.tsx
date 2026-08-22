import { ScoreRing } from "@/components/ui";

interface Component {
  key: string;
  label: string;
  earned: number;
  max: number;
  ok: boolean;
  detail: string;
}
interface Breakdown {
  components: Component[];
  warnings: string[];
  blockers: string[];
  publishable: boolean;
}

export function ReadinessCard({ score, breakdown }: { score: number | null; breakdown: unknown }) {
  const b = (breakdown as Breakdown | null) ?? null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={score ?? 0} />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Market Readiness Score</h2>
          <p className="text-sm text-slate-500">
            {b?.publishable
              ? "This listing meets all requirements to publish."
              : "Complete the items below to strengthen your listing and unlock publishing."}
          </p>
        </div>
      </div>

      {b && (
        <>
          <ul className="mt-4 divide-y divide-slate-100">
            {b.components.map((c) => (
              <li key={c.key} className="flex items-center gap-3 py-2">
                <span aria-hidden className={c.ok ? "text-green-600" : "text-slate-300"}>
                  {c.ok ? "✓" : "○"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{c.label}</p>
                  <p className="text-xs text-slate-500">{c.detail}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {c.earned}/{c.max}
                </span>
              </li>
            ))}
          </ul>

          {b.warnings.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Data checks</p>
              <ul className="ml-4 list-disc">
                {b.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {b.blockers.length > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">Required before publishing</p>
              <ul className="ml-4 list-disc">
                {b.blockers.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
