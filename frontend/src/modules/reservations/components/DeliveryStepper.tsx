import { CircleCheckBig, Package, Truck } from 'lucide-react';
import { cn } from '@/shared/utils';

export type DeliveryStepperStep = 'PREPARING' | 'OUT_FOR_DELIVERY';

interface DeliveryStepperProps {
  currentStep: DeliveryStepperStep;
}

const STEPS = [
  { key: 'PREPARING', label: 'Preparing', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CircleCheckBig },
] as const;

/**
 * The Recipient's 3-step delivery progress indicator (E8). Only ever
 * displays `PREPARING` or `OUT_FOR_DELIVERY` as the current step — once
 * `DELIVERED`, `DeliveredConfirmation` replaces this component entirely
 * rather than this stepper ever reaching its own third step as "current."
 *
 * State is conveyed by icon and text together, never by color alone.
 */
export function DeliveryStepper({ currentStep }: DeliveryStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);
  const currentStepLabel = STEPS[currentIndex]?.label ?? STEPS[0].label;

  return (
    <>
      {/* I3 — the enclosing `aria-live="polite"` region in DeliveryTrackingPanel
          needs text content that actually changes with `currentStep` to have
          anything to announce; the icons/labels below stay identical text
          across states (only color changes), so this line carries the change. */}
      <p className="sr-only">
        Status: {currentStepLabel}
      </p>

      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const isReached = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <li
              key={step.key}
              className="flex flex-1 items-center last:flex-none"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border-2 transition-colors duration-200',
                    isReached
                      ? 'border-[#3D6852] bg-[#3D6852] text-white'
                      : 'border-[#E5E7EB] bg-white text-[#9CA3AF]',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'max-w-[4.5rem] text-center text-xs font-semibold transition-colors duration-200',
                    isReached ? 'text-[#2E5A47]' : 'text-[#9CA3AF]',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors duration-200',
                    index < currentIndex ? 'bg-[#3D6852]' : 'bg-[#E5E7EB]',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default DeliveryStepper;
