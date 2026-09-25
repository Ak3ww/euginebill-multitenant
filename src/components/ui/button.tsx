import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 active:scale-[0.99] touch-action-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-600/20 active:bg-blue-800",
        destructive: "bg-red-600 hover:bg-red-700 text-white shadow-xs border border-red-600/20 active:bg-red-800",
        outline: "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700 shadow-xs",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline",
        success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-600/20",
        warning: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs border border-amber-600/20",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-7 text-sm font-semibold has-[>svg]:px-5",
        xl: "h-12 rounded-2xl px-8 text-base font-semibold has-[>svg]:px-6",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
