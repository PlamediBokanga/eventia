import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-auto rounded-xl border border-primary/10">
      <table className="w-full text-xs">{children}</table>
    </div>
  );
}
