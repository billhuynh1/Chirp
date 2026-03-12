'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type FormSubmitButtonProps = {
  children: React.ReactNode;
  pendingText: string;
  successToastMessage?: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
};

export function FormSubmitButton({
  children,
  pendingText,
  successToastMessage,
  className,
  variant,
  size
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const router = useRouter();
  const { toast } = useToast();
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (!wasPendingRef.current || !successToastMessage) {
      return;
    }

    wasPendingRef.current = false;
    toast({
      title: successToastMessage,
      variant: 'success',
      durationMs: 2800
    });
    router.refresh();
  }, [pending, router, successToastMessage, toast]);

  return (
    <Button
      type="submit"
      className={className}
      variant={variant}
      size={size}
      isLoading={pending}
      loadingText={pendingText}
    >
      {children}
    </Button>
  );
}
