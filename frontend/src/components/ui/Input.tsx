import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60",
        className
      )}
    />
  );
}
