/**
 * Placeholder card shown in the browse grid while the catalog is loading.
 * Mirrors `ControllerCard`'s overall shape so the layout doesn't jump when
 * real data arrives. Decorative only — the loading state is announced once
 * by an `sr-only` message on the containing region, so this is `aria-hidden`.
 */
export function ControllerCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="aspect-square rounded-t-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-5 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-6 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-auto flex gap-2">
          <div className="h-9 flex-1 rounded-md bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 w-16 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  )
}
