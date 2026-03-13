'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { approveDraftAction } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Textarea } from '@/components/ui/textarea';

type FocusQueueDraftEditorProps = {
  reviewId: number;
  draftId: number;
  draftText: string;
};

export function FocusQueueDraftEditor({
  reviewId,
  draftId,
  draftText
}: FocusQueueDraftEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [approvedText, setApprovedText] = useState(draftText);

  function handleCancel() {
    setApprovedText(draftText);
    setIsEditing(false);
  }

  return (
    <div className="rounded-[1rem] border border-border/70 bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current draft</p>
        {!isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setIsEditing(true)}
            aria-label="Edit draft"
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </div>

      {!isEditing ? (
        <div className="mt-3 rounded-[0.875rem] border border-border bg-white px-3 py-2 dark:border-input dark:bg-input/30">
          <p className="line-clamp-5 text-sm leading-6 whitespace-pre-wrap text-foreground">
            {draftText}
          </p>
        </div>
      ) : (
        <form action={approveDraftAction} className="mt-3 space-y-3">
          <input type="hidden" name="reviewId" value={reviewId} />
          <input type="hidden" name="draftId" value={draftId} />
          <Textarea
            name="approvedText"
            value={approvedText}
            onChange={(event) => setApprovedText(event.target.value)}
            className="min-h-28 rounded-[0.875rem] border-border bg-white dark:border-input dark:bg-input/30"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <FormSubmitButton className="w-full justify-center rounded-full" pendingText="Approving...">
              Approve draft
            </FormSubmitButton>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center rounded-full"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
