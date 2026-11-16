"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions";
import { btnPrimary } from "@/lib/ui";

const MESSAGES = {
  invalid: "Codice non valido.",
  locked: "Troppi tentativi: riprova tra 15 minuti.",
  config: "Login non configurato sul server.",
} as const;

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="code">Codice dell&apos;app di autenticazione</label>
      <input
        id="code" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} autoComplete="one-time-code" autoFocus required
        className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-center text-xl tracking-[0.4em] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{MESSAGES[state.error]}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full justify-center`}>{pending ? "Verifico…" : "Entra"}</button>
    </form>
  );
}
