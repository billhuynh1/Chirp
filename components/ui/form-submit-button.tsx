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
} & Omit<
  React.ComponentProps<typeof Button>,
  'type' | 'isLoading' | 'loadingText' | 'children' | 'variant' | 'size' | 'className'
> & {
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
  size,
  onClick,
  ...buttonProps
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const router = useRouter();
  const { toast } = useToast();
  const wasPendingRef = useRef(false);
  const isClickedSubmitterRef = useRef(false);

  const isLoading = pending && isClickedSubmitterRef.current;

  useEffect(() => {
    if (isLoading) {
      wasPendingRef.current = true;
      return;
    }

    if (pending) {
      return;
    }

    if (!wasPendingRef.current || !successToastMessage) {
      if (!pending) {
        isClickedSubmitterRef.current = false;
      }
      return;
    }

    wasPendingRef.current = false;
    isClickedSubmitterRef.current = false;
    toast({
      title: successToastMessage,
      variant: 'success',
      durationMs: 2800
    });
    router.refresh();
  }, [isLoading, pending, router, successToastMessage, toast]);

  return (
    <Button
      type="submit"
      className={className}
      variant={variant}
      size={size}
      isLoading={isLoading}
      loadingText={pendingText}
      onClick={(event) => {
        isClickedSubmitterRef.current = true;
        onClick?.(event);
      }}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
