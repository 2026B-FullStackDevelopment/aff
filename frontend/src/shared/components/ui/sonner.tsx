import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-slate-500 text-xs',
          actionButton:
            'group-[.toast]:bg-[#3D6852] group-[.toast]:text-white font-medium text-xs',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 font-medium text-xs',
          success:
            'group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50/90 group-[.toaster]:text-emerald-950',
          error:
            'group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50/90 group-[.toaster]:text-red-950',
          warning:
            'group-[.toaster]:border-[#D5B77D] group-[.toaster]:bg-[#FFF6E3] group-[.toaster]:text-[#5B3A00]',
          info:
            'group-[.toaster]:border-blue-200 group-[.toaster]:bg-blue-50/90 group-[.toaster]:text-blue-950',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';
