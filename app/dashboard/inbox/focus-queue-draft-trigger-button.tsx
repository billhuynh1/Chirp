'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type FocusQueueDraftTriggerButtonProps = {
  reviewId: number;
  draftId?: number | null;
  currentDraftText?: string;
  mode: 'generate' | 'regenerate';
  label: string;
  pendingText: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

type ApiErrorPayload = {
  draft?: {
    id?: number;
    draftText?: string;
    generationMetadata?: {
      source?: string;
      reason?: string;
      openaiError?: {
        status?: number;
        code?: string;
        message?: string;
      };
    };
  };
  error?: {
    message?: string;
  };
};

export function FocusQueueDraftTriggerButton({
  reviewId,
  draftId,
  currentDraftText,
  mode,
  label,
  pendingText,
  className,
  variant = 'default'
}: FocusQueueDraftTriggerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading) {
      return;
    }

    if (mode === 'regenerate' && !draftId) {
      toast({
        title: 'Could not regenerate draft',
        description: 'No active draft is available for this review.',
        variant: 'destructive',
        durationMs: 3200
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generationReason: mode === 'generate' ? 'manual' : 'regenerate'
        })
      });

      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      if (!response.ok) {
        toast({
          title: mode === 'generate' ? 'Could not generate draft' : 'Could not regenerate draft',
          description: payload?.error?.message ?? 'Please try again in a moment.',
          variant: 'destructive',
          durationMs: 6500
        });
        return;
      }

      const returnedDraftId = payload?.draft?.id;
      const returnedDraftText = payload?.draft?.draftText;
      const returnedDraftSource = payload?.draft?.generationMetadata?.source;
      const returnedDraftReason = payload?.draft?.generationMetadata?.reason;
      const returnedOpenAIError = payload?.draft?.generationMetadata?.openaiError;
      const returnedSameDraft =
        mode === 'regenerate' &&
        ((typeof returnedDraftId === 'number' && returnedDraftId === draftId) ||
          (typeof returnedDraftText === 'string' &&
            typeof currentDraftText === 'string' &&
            returnedDraftText.trim() === currentDraftText.trim()));

      let toastTitle = mode === 'generate' ? 'Draft generated' : 'Draft regenerated';
      let toastVariant: 'success' | 'destructive' = 'success';
      let toastDescription: string | undefined;
      if (returnedDraftSource === 'rules') {
        if (returnedDraftReason === 'critical_risk_gate') {
          toastDescription =
            'Critical risk review: safety gate prevented OpenAI generation and used fallback rules.';
        } else if (returnedDraftReason === 'missing_openai_key') {
          toastTitle = 'AI regeneration unavailable';
          toastVariant = 'destructive';
          toastDescription =
            'OpenAI key not available to the server runtime. A fallback draft was generated instead.';
        } else if (returnedDraftReason === 'openai_request_failed') {
          toastTitle = 'AI regeneration failed';
          toastVariant = 'destructive';
          const detail = [
            typeof returnedOpenAIError?.status === 'number'
              ? `status ${returnedOpenAIError.status}`
              : null,
            returnedOpenAIError?.code ? `code ${returnedOpenAIError.code}` : null,
            returnedOpenAIError?.message
              ? `message ${returnedOpenAIError.message.slice(0, 180)}`
              : null
          ]
            .filter(Boolean)
            .join(', ');
          toastDescription =
            detail.length > 0
              ? `OpenAI request failed (${detail}). A fallback draft was generated instead.`
              : 'OpenAI request failed. A fallback draft was generated instead.';
        } else {
          toastDescription =
            'Fallback rules generated this draft. OpenAI may be unavailable or blocked by safety gates.';
        }
      } else if (returnedSameDraft) {
        toastDescription =
          'The model returned the same wording. You can regenerate again or edit manually.';
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        variant: toastVariant,
        durationMs: toastVariant === 'destructive' ? 7000 : 6000
      });

      const nextQuery = new URLSearchParams(searchParams.toString());
      nextQuery.set('refresh', String(Date.now()));
      const nextHref = `${pathname}?${nextQuery.toString()}`;
      router.replace(nextHref, { scroll: false });
      router.refresh();
    } catch {
      toast({
        title: mode === 'generate' ? 'Could not generate draft' : 'Could not regenerate draft',
        description: 'Network error while requesting a draft.',
        variant: 'destructive',
        durationMs: 6500
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      className={className}
      variant={variant}
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {pendingText}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
