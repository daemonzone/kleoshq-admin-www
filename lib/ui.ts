export const card = "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
export const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
export const td = "px-3 py-2 align-top text-sm text-zinc-800 dark:text-zinc-200";
export const btn = "inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50";
export const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-500`;
export const btnGhost = `${btn} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`;
export const btnDanger = `${btn} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/30`;

export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });
}
