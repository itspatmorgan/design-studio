import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Adapted from the starter's shadcn/Base UI Button for Marketing's brand geometry.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline: 'border-input bg-background text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        link: 'h-auto border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground',
      },
      size: { default: 'h-10 px-4', sm: 'h-8 px-3', lg: 'h-12 px-5' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
