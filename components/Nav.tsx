import Link from "next/link";
import { logout } from "@/app/actions";

const LINKS = [
  ["/", "Panoramica"],
  ["/beta", "Beta"],
  ["/sites", "Siti"],
  ["/pipeline", "Pipeline & AI"],
  ["/email", "Email"],
  ["/audit", "Audit"],
] as const;

export default function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4">
        <span className="text-base font-semibold tracking-tight">Site<span className="text-blue-600">Witness</span> <span className="text-xs font-medium text-zinc-500">admin</span></span>
        <nav className="flex flex-1 items-center gap-4 overflow-x-auto text-sm">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap text-zinc-600 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400">{label}</Link>
          ))}
        </nav>
        <form action={logout}>
          <button type="submit" className="text-sm text-zinc-500 hover:text-red-600">Esci</button>
        </form>
      </div>
    </header>
  );
}
