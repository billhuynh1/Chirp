import { redirect } from 'next/navigation';
import { CheckCircle2, Link2, MapPinned, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  COMING_SOON_SERVICES,
  getOnboardingStatus,
  SERVICE_SUGGESTIONS
} from '@/lib/services/businesses';
import { getSelectableLocationsFromMetadata } from '@/lib/services/integrations/google';
import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist';
import { ServiceAutocompleteInput } from '@/components/onboarding/ServiceAutocompleteInput';
import {
  completeSetupAction,
  saveBusinessProfileAction,
  saveBusinessSettingsAction,
  selectGoogleLocationsAction,
  syncNowAction
} from '../actions';

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
  const fieldSurfaceClass =
    'mt-2 rounded-2xl border-0 bg-muted/70 shadow-none focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/60';

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Set up your workspace
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Complete your business details, connect Google Business Profile, and configure
          drafting defaults before continuing to the dashboard.
        </p>
      </div>

      <GettingStartedChecklist status={onboardingStatus} />
      {errorParam === 'incomplete-onboarding' ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Complete all setup steps before continuing to the dashboard.
        </div>
      ) : null}
      {errorParam === 'invalid-service' ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Service is invalid. Use plumbing for now. HVAC, Electrical, and Roofing are coming soon.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card id="business-profile" className="scroll-mt-24 bg-card">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Business profile</h2>
            <p className="text-sm text-muted-foreground">
              Add core business details used for review routing and reply style.
            </p>
          </CardHeader>
          <CardContent>
            <form action={saveBusinessProfileAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={workspace.business.name}
                  className={fieldSurfaceClass}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="vertical">Service</Label>
                  <ServiceAutocompleteInput
                    id="vertical"
                    name="vertical"
                    defaultValue={workspace.business.vertical}
                    suggestions={SERVICE_SUGGESTIONS}
                    comingSoon={COMING_SOON_SERVICES}
                    ariaDescribedBy="service-help"
                    className={fieldSurfaceClass}
                  />
                  <p id="service-help" className="mt-2 text-sm text-muted-foreground">
                    Currently available: plumbing.
                  </p>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    name="timezone"
                    defaultValue={workspace.business.timezone}
                    className={fieldSurfaceClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="primaryPhone">Primary phone</Label>
                  <Input
                    id="primaryPhone"
                    name="primaryPhone"
                    defaultValue={workspace.business.primaryPhone ?? ''}
                    className={fieldSurfaceClass}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewContactEmail">Review contact email</Label>
                  <Input
                    id="reviewContactEmail"
                    name="reviewContactEmail"
                    type="email"
                    defaultValue={workspace.business.reviewContactEmail ?? workspace.user.email}
                    className={fieldSurfaceClass}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  defaultValue={workspace.business.website ?? ''}
                  className={fieldSurfaceClass}
                />
              </div>
              <Button className="rounded-full">
                Save business profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="connect-google" className="scroll-mt-24 bg-card">
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              2. Connect Google Business Profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Link your account and choose at least one location to import reviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] bg-muted p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 className="size-4 text-primary" />
                Connection status
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {workspace.connectedAccount
                  ? `Connected to Google (${workspace.connectedAccount.status}).`
                  : 'No Google account connected yet.'}
              </p>
            </div>

            {!workspace.connectedAccount ? (
              <form action="/api/integrations/google/start" method="post">
                <Button className="rounded-full">
                  Connect Google Business Profile
                </Button>
              </form>
            ) : (
              <>
                <form action={syncNowAction}>
                  <input type="hidden" name="connectedAccountId" value={workspace.connectedAccount.id} />
                  <Button variant="outline" className="rounded-full">
                    Sync now
                  </Button>
                </form>

                {selectableLocations.length > 0 ? (
                  <form action={selectGoogleLocationsAction} className="space-y-4">
                    <input type="hidden" name="connectedAccountId" value={workspace.connectedAccount.id} />
                    <div className="space-y-3">
                      {selectableLocations.map((location) => (
                        <label
                          key={location.externalLocationId}
                          className="flex items-start gap-3 rounded-[1.5rem] border border-border bg-muted p-4"
                        >
                          <input
                            type="checkbox"
                            name="locationIds"
                            value={location.externalLocationId}
                            defaultChecked={selectedLocationIds.includes(
                              location.externalLocationId
                            )}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-foreground">{location.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">{location.address}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {location.phone}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button className="rounded-full">
                      Save selected locations
                    </Button>
                  </form>
                ) : null}
              </>
            )}

            {workspace.connectedAccount && workspace.connectedAccount.lastError ? (
              <p className="text-sm text-destructive">{workspace.connectedAccount.lastError}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card id="drafting-defaults" className="scroll-mt-24 bg-card">
        <CardHeader className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            3. Drafting and safety defaults
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure tone, escalation, and guardrails for reply generation.
          </p>
        </CardHeader>
        <CardContent>
          <form action={saveBusinessSettingsAction} className="space-y-4">
            <div>
              <Label htmlFor="brandVoice">Brand voice</Label>
              <Textarea
                id="brandVoice"
                name="brandVoice"
                defaultValue={workspace.settings.brandVoice}
                className={`${fieldSurfaceClass} rounded-[1.5rem]`}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="signoffName">Sign-off name</Label>
                <Input
                  id="signoffName"
                  name="signoffName"
                  defaultValue={workspace.settings.signoffName}
                  className={fieldSurfaceClass}
                />
              </div>
              <div>
                <Label htmlFor="defaultReplyStyle">Default reply style</Label>
                <Input
                  id="defaultReplyStyle"
                  name="defaultReplyStyle"
                  defaultValue={workspace.settings.defaultReplyStyle}
                  className={fieldSurfaceClass}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="escalationMessage">Escalation message</Label>
              <Textarea
                id="escalationMessage"
                name="escalationMessage"
                defaultValue={workspace.settings.escalationMessage}
                className={`${fieldSurfaceClass} rounded-[1.5rem]`}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="allowedPromises">Allowed promises</Label>
                <Input
                  id="allowedPromises"
                  name="allowedPromises"
                  defaultValue={workspace.settings.allowedPromises.join(', ')}
                  className={fieldSurfaceClass}
                />
              </div>
              <div>
                <Label htmlFor="bannedPhrases">Banned phrases</Label>
                <Input
                  id="bannedPhrases"
                  name="bannedPhrases"
                  defaultValue={workspace.settings.bannedPhrases.join(', ')}
                  className={fieldSurfaceClass}
                />
              </div>
              <div>
                <Label htmlFor="notificationEmails">Notification emails</Label>
                <Input
                  id="notificationEmails"
                  name="notificationEmails"
                  defaultValue={workspace.settings.notificationEmails.join(', ')}
                  className={fieldSurfaceClass}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="manualReviewRules">Manual review rules</Label>
              <Input
                id="manualReviewRules"
                name="manualReviewRules"
                aria-describedby="manualReviewRules-help"
                defaultValue={workspace.settings.manualReviewRules.join(', ')}
                className={fieldSurfaceClass}
              />
              <p id="manualReviewRules-help" className="mt-2 text-sm text-muted-foreground">
                Comma-separated triggers that always require manual review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full">
                Save safety settings
              </Button>
              <button
                type="submit"
                formAction={completeSetupAction}
                disabled={!onboardingStatus.allComplete}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-foreground"
              >
                <CheckCircle2 className="size-4" />
                Mark setup complete
              </button>
              {!onboardingStatus.allComplete ? (
                <p className="self-center text-sm text-muted-foreground">
                  Complete all checklist steps to continue.
                </p>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: MapPinned,
            title: 'Locations selected',
            value: String(selectedLocationIds.length)
          },
          {
            icon: Sparkles,
            title: 'Reply style',
            value: workspace.settings.defaultReplyStyle
          },
          {
            icon: CheckCircle2,
            title: 'Onboarding',
            value: workspace.business.onboardingCompletedAt ? 'Complete' : 'In progress'
          }
        ].map((item) => (
          <Card
            key={item.title}
            className="bg-card"
          >
            <CardContent className="flex items-center gap-4 px-6 py-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{item.title}</div>
                <div className="text-xl font-semibold text-foreground">{item.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
