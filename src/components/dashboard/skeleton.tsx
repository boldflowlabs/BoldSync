import { cn } from '@/lib/utils'

/**
 * Shared skeleton primitive — a pulsing slate block sized to whatever
 * container it's dropped into. Used by every dashboard widget while
 * its data fetches.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonLine className="mt-3 h-8 w-16" />
      <SkeletonLine className="mt-2 h-4 w-32" />
    </div>
  )
}

/**
 * Base pulsing block — abstracts the color/animation boilerplate so you
 * just compose sizes.
 */
function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
    />
  )
}
