import type { ComponentProps } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { cn } from '@/shared/utils';

type CourierButtonProps = ComponentProps<typeof Button>;

/**
 * The Courier portal's primary action button.
 *
 * Wraps the shared {@link Button} so the Courier teal palette and the
 * design-system motion classes (`docs/design_system.md` → Motion &
 * Interaction Guidelines) are declared once rather than repeated at every
 * call site. There is intentionally only one style — in the Courier
 * screens every button is the primary action.
 */
export function CourierButton({ className, ...props }: CourierButtonProps) {
  return (
    <Button
      className={cn(
        'bg-courier-primary text-courier-on-primary hover:bg-courier-primary-hover hover:shadow-md active:scale-[0.98] transition-all duration-200 ease-out focus-visible:ring-courier-primary/40',
        className,
      )}
      {...props}
    />
  );
}
