import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';
import { usePortalContainer } from '@/lib/portal';

function TooltipProvider(props: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={300} {...props} />;
}
function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />;
}
function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger {...props} />;
}
function TooltipContent({ className, children, ...props }: TooltipPrimitive.Popup.Props) {
  return <TooltipPrimitive.Portal container={usePortalContainer()}>
    <TooltipPrimitive.Positioner sideOffset={6} className="isolate z-50">
      <TooltipPrimitive.Popup data-slot="tooltip-content" className={cn('max-w-xs rounded-md bg-foreground px-3 py-2 text-xs text-background shadow-lg', className)} {...props}>
        {children}
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>;
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
