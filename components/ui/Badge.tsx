const STYLES: Record<string, string> = {
  ASSET: "bg-blue-50 text-blue-700 ring-blue-600/20",
  LIABILITY: "bg-amber-50 text-amber-700 ring-amber-600/20",
  EQUITY: "bg-purple-50 text-purple-700 ring-purple-600/20",
  REVENUE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  EXPENSE: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function Badge({ type }: { type: string }) {
  const style = STYLES[type] ?? "bg-slate-100 text-slate-700 ring-slate-600/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {type}
    </span>
  );
}
