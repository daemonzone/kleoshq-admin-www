// Same colours as the public site's source status pill (kleoshq-public-www/components/SourceStatus.tsx).
const STYLE: Record<string, { label: string; pill: string }> = {
  healthy: { label: "healthy", pill: "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20" },
  warning: { label: "warning", pill: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20" },
  compromised: { label: "compromised", pill: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/20" },
  awaiting_verification: { label: "awaiting verification", pill: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/20 dark:text-sky-400 dark:ring-sky-400/20" },
  "not scanned yet": { label: "not scanned yet", pill: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20" },
};

export default function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-zinc-400">—</span>;
  const s = STYLE[status] ?? { label: status, pill: STYLE["not scanned yet"].pill }; // unknown value: grey, text shown as is
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.pill}`}>{s.label}</span>;
}
