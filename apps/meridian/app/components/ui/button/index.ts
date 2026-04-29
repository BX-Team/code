import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-white hover:-translate-y-px hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'bg-white/[0.06] text-foreground border border-[var(--line-2)] hover:bg-white/10',
        link: 'text-primary underline-offset-4 hover:underline',
        pill:
          'rounded-full bg-primary text-primary-foreground hover:bg-white hover:-translate-y-px',
      },
      size: {
        default: 'h-10 px-5 py-2.5',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6',
        icon: 'size-10',
        nav: 'h-9 px-4 text-sm rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
