export default function ProviderCardSkeleton() {
  return (
    <div className="surface animate-pulse overflow-hidden rounded-2xl">
      <div className="aspect-[16/10] bg-mist" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-20 rounded bg-mist" />
        <div className="h-5 w-3/4 rounded bg-mist" />
        <div className="h-3 w-full rounded bg-mist" />
        <div className="h-3 w-2/3 rounded bg-mist" />
        <div className="flex justify-between pt-2">
          <div className="h-4 w-24 rounded bg-mist" />
          <div className="h-4 w-20 rounded bg-mist" />
        </div>
        <div className="h-9 w-full rounded-xl bg-mist" />
      </div>
    </div>
  );
}
