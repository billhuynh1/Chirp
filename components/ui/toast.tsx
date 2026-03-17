'use client';

import { CheckCircle2, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'destructive';

type ToastOptions = {
  title: string;
  description?: string;
  durationMs?: number;
  variant?: ToastVariant;
};

type ToastItem = ToastOptions & {
  id: number;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => number;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastVariantClass(variant: ToastVariant) {
  if (variant === 'destructive') {
    return 'border-2 border-destructive/55 bg-destructive/16 text-destructive shadow-[0_18px_40px_rgba(220,38,38,0.18)]';
  }
  if (variant === 'success') {
    return 'border-2 border-success/45 bg-success/16 text-foreground shadow-[0_18px_40px_rgba(22,163,74,0.14)]';
  }
  return 'border-2 border-primary/20 bg-primary/10 text-foreground shadow-[0_18px_40px_rgba(15,118,110,0.12)]';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, durationMs = 4500, variant = 'default' }: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, title, description, durationMs, variant }]);

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ toast, dismissToast }),
    [dismissToast, toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4"
      >
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className={cn(
                'toast-enter pointer-events-auto rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm',
                toastVariantClass(item.variant ?? 'default')
              )}
            >
              <div className="flex items-start gap-3">
                {item.variant === 'success' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-foreground/80">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }
  return context;
}
