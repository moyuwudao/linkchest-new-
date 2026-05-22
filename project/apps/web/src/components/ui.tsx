'use client';

export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex gap-4">
        <div className="skeleton w-32 h-24 flex-shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="flex gap-1.5 mt-1">
            <div className="skeleton h-5 w-14 rounded-full" />
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-parchment/20 dark:border-chest-700/50">
      <div className="skeleton w-10 h-10 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-5 w-16 rounded-full" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="mb-5">
        <div className="w-20 h-20 rounded-full bg-chest-500/[0.04] dark:bg-chest-800/50 flex items-center justify-center mb-4 mx-auto shadow-card">
          <div className="opacity-40 dark:opacity-30">
            {icon}
          </div>
        </div>
      </div>
      <h3 className="text-base font-display font-semibold text-charcoal dark:text-parchment/70 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-taupe dark:text-taupe-light mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function CollectionSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function CollectionSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <div className="bg-white dark:bg-chest-800/50 rounded-xl overflow-hidden border border-chest-500/[0.06] dark:border-parchment/5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  );
}
