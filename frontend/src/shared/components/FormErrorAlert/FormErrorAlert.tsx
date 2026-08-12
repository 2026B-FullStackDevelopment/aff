import { AlertCircle } from 'lucide-react';

interface FormErrorAlertProps {
  message: string | null;
}

export function FormErrorAlert({ message }: FormErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-lg p-3 text-sm font-semibold bg-red-50 text-red-700 border border-red-200 animate-in fade-in-50 duration-200"
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default FormErrorAlert;
