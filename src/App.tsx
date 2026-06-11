import { Gamepad2 } from 'lucide-react'

function App() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col items-start gap-6 px-6 py-16">
      <div className="flex items-center gap-3 text-zinc-500">
        <Gamepad2 className="size-6" aria-hidden="true" />
        <span className="text-sm tracking-wide uppercase">8bitdo-compare</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        8BitDo controller comparison tool
      </h1>

      <p className="text-zinc-600 dark:text-zinc-400">
        A side-by-side comparison for 8BitDo game controllers. Pick up to 3 and
        see prices and the full published spec set lined up next to each other.
      </p>

      <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <strong className="font-medium text-zinc-900 dark:text-zinc-100">
          Phase 0:
        </strong>{' '}
        scaffolding only. The Browse and Compare views land in Phase 2 and 3.
        See <code>docs/specs/</code> for the design and implementation plan.
      </p>
    </main>
  )
}

export default App
