import Link from "next/link";

import { JoinForm } from "./_components/join-form";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-12">
      <header className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">Blind Test</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Crée une salle entre amis. Devine les musiques. Marque des points.
        </p>
      </header>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/host/playlists"
          className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
        >
          <div className="text-2xl font-semibold">Créer une salle</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Tu es l&apos;hôte. Choisis ou crée une playlist YouTube et invite les joueurs.
          </p>
          <span className="mt-auto pt-6 text-sm font-medium text-blue-600 group-hover:underline">
            Choisir une playlist →
          </span>
        </Link>

        <section className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-2xl font-semibold">Rejoindre</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Saisis le code à 6 lettres affiché par l&apos;hôte.
          </p>
          <JoinForm />
        </section>
      </div>
    </main>
  );
}
