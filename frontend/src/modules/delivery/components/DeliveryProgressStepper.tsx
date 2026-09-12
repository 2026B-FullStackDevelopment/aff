import { Check } from 'lucide-react';
import type { DeliveryStage } from '@/types/api';
import { cn } from '@/shared/utils';

interface DeliveryProgressStepperProps {
  stage: DeliveryStage;
}

type StepState = 'complete' | 'current' | 'upcoming';

const STEPS = ['Claimed', 'Picked up', 'Delivered'] as const;

/** The 0-based index of the *current* step for a given server stage. */
function currentStepIndex(stage: DeliveryStage): number {
  switch (stage) {
    case 'PICKED_UP':
      return 1;
    case 'DELIVERED':
      return 2;
    // AWAITING_COURIER / ASSIGNED / CANCELLED — the Courier is at "Claimed".
    default:
      return 0;
  }
}

/**
 * A three-step progress indicator — Claimed → Picked up → Delivered — for
 * the active delivery screen. Progress is conveyed by icon, text label and
 * position, never colour alone (`docs/design_system.md`).
 */
export function DeliveryProgressStepper({ stage }: DeliveryProgressStepperProps) {
  const current = currentStepIndex(stage);

  return (
    <ol aria-label="Delivery progress" className="flex items-start">
      {STEPS.map((label, index) => {
        const state: StepState =
          index < current ? 'complete' : index === current ? 'current' : 'upcoming';
        const isLast = index === STEPS.length - 1;

        return (
          <li key={label} className={cn('flex items-start', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'grid size-8 place-items-center rounded-full text-sm font-semibold transition-colors duration-200',
                  state === 'complete' && 'bg-courier-primary text-courier-on-primary',
                  state === 'current' &&
                    'bg-courier-accent text-courier-on-primary ring-4 ring-courier-primary-container',
                  state === 'upcoming' &&
                    'border border-courier-border bg-courier-surface text-courier-text-muted',
                )}
              >
                {state === 'complete' ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    <span className="sr-only">completed</span>
                  </>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  'text-xs',
                  state === 'current'
                    ? 'font-semibold text-courier-title'
                    : 'text-courier-text-muted',
                )}
              >
                {label}
              </span>
            </div>

            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'mt-4 h-0.5 flex-1 transition-colors duration-200',
                  index < current ? 'bg-courier-primary' : 'bg-shared-progress-track',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
