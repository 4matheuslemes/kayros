import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // base
  [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-medium transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--primary)] text-white rounded-full",
          "hover:bg-[var(--primary-dark)] active:scale-[0.98]",
        ],
        secondary: [
          "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] rounded-md",
          "hover:bg-[var(--background)] active:scale-[0.98]",
        ],
        ghost: [
          "text-[var(--ink)] bg-transparent rounded-md",
          "hover:bg-[var(--background)] active:scale-[0.98]",
        ],
        destructive: [
          "bg-red-600 text-white rounded-full",
          "hover:bg-red-700 active:scale-[0.98]",
        ],
        accent: [
          "bg-[var(--accent)] text-white rounded-full",
          "hover:opacity-90 active:scale-[0.98]",
        ],
      },
      size: {
        sm:  "h-9  px-3  text-sm  min-w-[2.25rem]",
        md:  "h-11 px-5  text-base min-w-[2.75rem]",
        lg:  "h-14 px-7  text-lg  min-w-[3.5rem]",
        icon:"h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
