import { redirect } from 'next/navigation';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { getOnboardingStatus } from '@/lib/services/businesses';
import { getSelectableLocationsFromMetadata } from '@/lib/services/integrations/google';
import { SetupWizardClient } from '@/components/onboarding/SetupWizardClient';

export default async function SetupPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business || !workspace.settings) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const errorParam = typeof params.error === 'string' ? params.error : '';
  const [onboardingStatus, selectableLocations] = await Promise.all([
    getOnboardingStatus(workspace.business.id),
    Promise.resolve(
      workspace.connectedAccount
        ? getSelectableLocationsFromMetadata(workspace.connectedAccount)
        : []
    )
  ]);

  const selectedLocationIds = Array.isArray(
    workspace.connectedAccount?.metadata?.['selectedLocationIds']
  )
    ? (workspace.connectedAccount?.metadata?.['selectedLocationIds'] as string[])
    : [];

  return (
    <SetupWizardClient
      errorParam={errorParam}
      onboardingStatus={onboardingStatus}
      business={{
        name: workspace.business.name,
        vertical: workspace.business.vertical,
        timezone: workspace.business.timezone,
        primaryPhone: workspace.business.primaryPhone ?? '',
        website: workspace.business.website ?? '',
        reviewContactEmail: workspace.business.reviewContactEmail ?? workspace.user.email,
        onboardingCompleted: Boolean(workspace.business.onboardingCompletedAt)
      }}
      settings={{
        brandVoice: workspace.settings.brandVoice,
        signoffName: workspace.settings.signoffName,
        escalationMessage: workspace.settings.escalationMessage,
        defaultReplyStyle: workspace.settings.defaultReplyStyle,
        allowedPromises: workspace.settings.allowedPromises,
        bannedPhrases: workspace.settings.bannedPhrases,
        notificationEmails: workspace.settings.notificationEmails,
        manualReviewRules: workspace.settings.manualReviewRules
      }}
      connectedAccount={
        workspace.connectedAccount
          ? {
              id: workspace.connectedAccount.id,
              status: workspace.connectedAccount.status,
              lastError: workspace.connectedAccount.lastError
            }
          : null
      }
      selectableLocations={selectableLocations}
      selectedLocationIds={selectedLocationIds}
    />
  );
}
