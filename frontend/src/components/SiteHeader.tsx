import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            GrowEasy
          </p>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">AI CSV Importer</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
