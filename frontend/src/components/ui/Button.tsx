import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary/90",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    ghost: "bg-transparent text-primary border border-primary/20 hover:bg-primary/5"
  };

  return (
    <button
      {...props}
      className={cn("px-5 py-3 rounded-xl font-medium transition", styles[variant], className)}
    >
      {children}
    </button>
  );
}
