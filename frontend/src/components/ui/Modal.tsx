import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  children
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg">
        {title && <h3 className="title-4 mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
