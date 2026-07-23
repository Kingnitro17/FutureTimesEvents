export default function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="skeleton h-56 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded-lg" />
        <div className="skeleton h-3 w-1/2 rounded-lg" />
        <div className="skeleton h-3 w-2/3 rounded-lg" />
        <div className="flex justify-between pt-2">
          <div className="skeleton h-4 w-16 rounded-lg" />
          <div className="skeleton h-4 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
