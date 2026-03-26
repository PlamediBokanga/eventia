export function Header({ title }: { title: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3 mb-4">
      <h1 className="title-3">{title}</h1>
      <p className="text-small">EVENTIA</p>
    </header>
  );
}
