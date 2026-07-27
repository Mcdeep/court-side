import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Icon, type IconName } from "./icon"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground font-bold hover:brightness-105 shadow-[0_1px_0_oklch(0.6_0.16_140)] active:translate-y-px",
        primary:     "bg-primary text-primary-foreground font-bold hover:brightness-105 shadow-[0_1px_0_oklch(0.6_0.16_140)] active:translate-y-px",
        ink:         "bg-ink text-paper font-semibold hover:bg-ink-soft active:translate-y-px",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:     "bg-white text-foreground ring-1 ring-zinc-200 hover:ring-zinc-300 hover:bg-zinc-50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "bg-transparent text-muted-foreground hover:bg-ink/5 hover:text-foreground dark:hover:bg-accent/50",
        link:        "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        md:      "h-9 px-4 py-2 has-[>svg]:px-3",
        xs:      "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm:      "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg:      "h-12 rounded-xl px-5 text-[15px] has-[>svg]:px-4",
        icon:    "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
  variant = "default",
  size = "default",
  asChild = false,
  icon,
  iconR,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    icon?: IconName
    iconR?: IconName
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? children : <>
        {icon && <Icon name={icon} className="w-[1.05em] h-[1.05em]" stroke={2.4} />}
        {children}
        {iconR && <Icon name={iconR} className="w-[1.05em] h-[1.05em]" stroke={2.4} />}
      </>}
    </Comp>
  )
}

export { Button, buttonVariants }
