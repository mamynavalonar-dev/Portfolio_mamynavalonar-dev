"use client";

import Link from "next/link";

export default function ProjectError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold">Le projet est temporairement indisponible</h1>
      <p className="max-w-lg text-white/75">Le chargement a échoué. Vous pouvez réessayer ou revenir au portfolio.</p>
      <button type="button" onClick={reset} className="rounded-xl bg-white px-5 py-3 text-black">Réessayer</button>
      <Link href="/#portfolio" className="underline underline-offset-4">Retour aux projets</Link>
    </main>
  );
}
