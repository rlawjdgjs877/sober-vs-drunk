import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sober/60",
  {
    variants: {
      variant: {
        sober: "bg-sober text-[#04111F] shadow-sober hover:brightness-110",
        drunk: "bg-drunk text-[#1F0B02] shadow-drunk hover:brightness-110",
        secondary: "bg-surface2 text-white border border-line hover:bg-[#1c2441]",
        ghost: "text-muted hover:text-white hover:bg-white/5",
        danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-xl",
        md: "h-12 px-5 text-[15px] rounded-2xl",
        lg: "h-14 px-6 text-base rounded-2xl",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
