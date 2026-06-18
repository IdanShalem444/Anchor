"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-all duration-300 ease-spring active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anchor/40 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Orange is reserved for primary actions only.
  primary:
    "bg-anchor text-white shadow-glow hover:bg-anchor-600 hover:shadow-lift",
  secondary:
    "glass text-ink hover:bg-white/80 hover:shadow-soft",
  ghost: "text-ink-soft hover:bg-black/[0.05] hover:text-ink",
  subtle: "bg-black/[0.04] text-ink hover:bg-black/[0.07]",
  danger:
    "bg-red-500 text-white shadow-soft hover:bg-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-13 px-7 text-[15px] rounded-2xl py-3.5",
  icon: "h-10 w-10 rounded-xl",
};

export function buttonClasses(variant: Variant = "secondary", size: Size = "md") {
  return cn(base, variants[variant], sizes[size]);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonClasses(variant, size), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
