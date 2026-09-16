import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  retryLabel?: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try Again',
  className,
  onRetry,
}: ErrorStateProps) {
  return (
    <section
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-white text-red-700">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-lg font-bold text-red-900">
        {title}
      </h2>

      <p className="mt-1 max-w-md text-sm leading-6 text-red-700">
        {message}
      </p>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-5 h-10 border-red-300 bg-white px-4 text-red-800 transition-all duration-200 ease-out hover:bg-red-100 hover:shadow-md active:scale-[0.98]"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </section>
  );
}

export default ErrorState;
