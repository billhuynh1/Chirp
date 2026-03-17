'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export function CriticalRiskDraftDialog({
  reviewId,
  mode,
  open,
  onOpenChange,
  onConfirm
}: {
  reviewId: number | string;
  mode: 'generate' | 'regenerate';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const actionLabel =
    mode === 'generate'
      ? 'Generate fallback draft'
      : 'Regenerate fallback draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Critical-risk review</DialogTitle>
          <DialogDescription>
            This review was flagged as critical risk, so AI draft generation is
            blocked. You can still {mode} a fallback draft for manual review.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-muted-foreground"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/dashboard/reviews/${reviewId}`}>Open full review</Link>
          </Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={onConfirm}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
