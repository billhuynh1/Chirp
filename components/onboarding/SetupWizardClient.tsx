'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Link2, Loader2, MapPinned, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { GettingStartedChecklist } from '@/components/onboarding/GettingStartedChecklist';
import { SetupBusinessProfileForm } from '@/components/onboarding/SetupBusinessProfileForm';
import {
  completeSetupAction,
  saveBusinessSettingsAction,
  saveBusinessProfileAction,
  selectGoogleLocationsAction,
  syncNowAction
} from '@/app/dashboard/actions';
import type {
  SetupOnboardingSnapshot,
  SetupStepActionResult
} from '@/lib/types/setup-step-action';

type SetupStatus = {
  steps: Array<{
    id: string;
    title: string;
    description: string;
    iconKey: 'building' | 'link' | 'sparkles';
    href: string;
    isComplete: boolean;
  }>;
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
};

type SetupWizardClientProps = {
  errorParam: string;
  onboardingStatus: SetupStatus;
  business: {
    name: string;
    vertical: string;
    timezone: string;
    primaryPhone: string;
    website: string;
    reviewContactEmail: string;
    onboardingCompleted: boolean;
  };
  settings: {
    brandVoice: string;
    signoffName: string;
    escalationMessage: string;
    defaultReplyStyle: string;
    allowedPromises: string[];
    bannedPhrases: string[];
    notificationEmails: string[];
    manualReviewRules: string[];
  };
  connectedAccount: {
    id: number;
    status: string;
    lastError: string | null;
  } | null;
  selectableLocations: Array<{
    externalLocationId: string;
    name: string;
    address: string | null;
    phone: string | null;
  }>;
  selectedLocationIds: string[];
};

type StepKey = 'business' | 'google' | 'drafting';

const fieldSurfaceClass =
  'mt-2 rounded-2xl border-0 bg-muted/70 text-foreground shadow-none placeholder:text-muted-foreground/80 placeholder:opacity-100 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/60';
const textareaFieldSurfaceClass = `${fieldSurfaceClass} px-4 py-2.5`;

function getStepComplete(status: SetupStatus, stepId: string) {
  return status.steps.find((step) => step.id === stepId)?.isComplete ?? false;
}

function applyOnboardingSnapshot(
  status: SetupStatus,
  snapshot: SetupOnboardingSnapshot
): SetupStatus {
  return {
    ...status,
    completedCount: snapshot.completedCount,
    totalCount: snapshot.totalCount,
    allComplete: snapshot.allComplete,
    steps: status.steps.map((step) => {
      if (step.id === 'business_info') {
        return { ...step, isComplete: snapshot.stepCompletion.businessProfile };
      }
      if (step.id === 'connect_google') {
        return { ...step, isComplete: snapshot.stepCompletion.googleLocations };
      }
      if (step.id === 'drafting_defaults') {
        return { ...step, isComplete: snapshot.stepCompletion.draftingDefaults };
      }
      return step;
    })
  };
}

export function SetupWizardClient({
  errorParam,
  onboardingStatus,
  business,
  settings,
  connectedAccount,
  selectableLocations,
  selectedLocationIds
}: SetupWizardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const connectedParam = searchParams.get('connected');

  const [status, setStatus] = useState(onboardingStatus);
  const [businessData, setBusinessData] = useState(business);
  const [settingsData, setSettingsData] = useState(settings);
  const [selectedLocationIdsData, setSelectedLocationIdsData] = useState(selectedLocationIds);
  const [googleConnectionStatus, setGoogleConnectionStatus] = useState(
    connectedAccount?.status ?? 'active'
  );

  const businessComplete = getStepComplete(status, 'business_info');
  const googleComplete = getStepComplete(status, 'connect_google');
  const draftingComplete = getStepComplete(status, 'drafting_defaults');

  const [expandedSteps, setExpandedSteps] = useState<Record<StepKey, boolean>>({
    business: !businessComplete,
    google: !googleComplete,
    drafting: !draftingComplete
  });

  const [businessServerError, setBusinessServerError] = useState('');
  const [googleServerError, setGoogleServerError] = useState('');
  const [draftingServerError, setDraftingServerError] = useState('');

  const submitBusinessInline = async (
    previousState: SetupStepActionResult | null,
    formData: FormData
  ) => {
    const result = await saveBusinessProfileAction(previousState, formData);
    return result ?? previousState;
  };

  const submitGoogleInline = async (
    previousState: SetupStepActionResult | null,
    formData: FormData
  ) => {
    const result = await selectGoogleLocationsAction(previousState, formData);
    return result ?? previousState;
  };

  const submitDraftingInline = async (
    previousState: SetupStepActionResult | null,
    formData: FormData
  ) => {
    const result = await saveBusinessSettingsAction(previousState, formData);
    return result ?? previousState;
  };

  const [businessResult, businessFormAction, businessPending] = useActionState<
    SetupStepActionResult | null,
    FormData
  >(submitBusinessInline, null);

  const [googleResult, googleFormAction, googlePending] = useActionState<
    SetupStepActionResult | null,
    FormData
  >(submitGoogleInline, null);

  const [draftingResult, draftingFormAction, draftingPending] = useActionState<
    SetupStepActionResult | null,
    FormData
  >(submitDraftingInline, null);

  useEffect(() => {
    setExpandedSteps((current) => ({
      business: businessComplete ? current.business : true,
      google: googleComplete ? current.google : true,
      drafting: draftingComplete ? current.drafting : true
    }));
  }, [businessComplete, draftingComplete, googleComplete]);

  useEffect(() => {
    if (!businessResult) {
      return;
    }

    setStatus((current) => applyOnboardingSnapshot(current, businessResult.onboarding));

    if (businessResult.ok) {
      setBusinessServerError('');
      if (businessResult.summary?.business) {
        setBusinessData((current) => ({
          ...current,
          vertical: businessResult.summary?.business?.service ?? current.vertical,
          timezone: businessResult.summary?.business?.timezone ?? current.timezone,
          primaryPhone: businessResult.summary?.business?.primaryPhone ?? '',
          website: businessResult.summary?.business?.website ?? ''
        }));
      }
      toast({
        title: businessResult.onboarding.stepCompletion.businessProfile
          ? 'Business profile completed'
          : 'Business profile saved',
        description: businessResult.onboarding.stepCompletion.businessProfile
          ? 'Step completed. You can edit this anytime.'
          : 'Saved. Add phone or website to complete this step.',
        variant: 'success',
        durationMs: 4500
      });
      if (businessResult.onboarding.stepCompletion.businessProfile) {
        setExpandedSteps((current) => ({ ...current, business: false }));
      }
      return;
    }

    setExpandedSteps((current) => ({ ...current, business: true }));
    setBusinessServerError(businessResult.message);
  }, [businessResult, toast]);

  useEffect(() => {
    if (!draftingResult) {
      return;
    }

    setStatus((current) => applyOnboardingSnapshot(current, draftingResult.onboarding));

    if (draftingResult.ok) {
      setDraftingServerError('');
      if (draftingResult.summary?.drafting) {
        setSettingsData((current) => ({
          ...current,
          signoffName: draftingResult.summary?.drafting?.signoffName ?? current.signoffName,
          defaultReplyStyle:
            draftingResult.summary?.drafting?.defaultReplyStyle ?? current.defaultReplyStyle
        }));
      }
      toast({
        title: draftingResult.onboarding.stepCompletion.draftingDefaults
          ? 'Drafting defaults completed'
          : 'Drafting defaults saved',
        description: draftingResult.onboarding.stepCompletion.draftingDefaults
          ? 'Step completed. You can edit drafting settings anytime.'
          : 'Drafting defaults updated.',
        variant: 'success',
        durationMs: 4500
      });
      if (draftingResult.onboarding.stepCompletion.draftingDefaults) {
        setExpandedSteps((current) => ({ ...current, drafting: false }));
      }
      return;
    }

    setExpandedSteps((current) => ({ ...current, drafting: true }));
    setDraftingServerError(draftingResult.message);
  }, [draftingResult, toast]);

  useEffect(() => {
    if (!googleResult) {
      return;
    }

    setStatus((current) => applyOnboardingSnapshot(current, googleResult.onboarding));

    if (googleResult.ok) {
      setGoogleServerError('');
      if (googleResult.summary?.google) {
        setSelectedLocationIdsData(googleResult.summary.google.selectedLocationIds);
        setGoogleConnectionStatus(googleResult.summary.google.connectionStatus);
      }
      toast({
        title: googleResult.onboarding.stepCompletion.googleLocations
          ? 'Google locations saved'
          : 'Locations saved',
        description: googleResult.onboarding.stepCompletion.googleLocations
          ? 'Step completed. You can edit selected locations anytime.'
          : 'Locations saved. Complete Google setup to finish this step.',
        variant: 'success',
        durationMs: 4500
      });
      if (googleResult.onboarding.stepCompletion.googleLocations) {
        setExpandedSteps((current) => ({ ...current, google: false }));
      }
      return;
    }

    setExpandedSteps((current) => ({ ...current, google: true }));
    setGoogleServerError(googleResult.message);
  }, [googleResult, toast]);

  useEffect(() => {
    if (connectedParam !== 'google') {
      return;
    }

    toast({
      title: 'Google account connected',
      description: 'Now select at least one location to complete this step.',
      variant: 'success',
      durationMs: 4500
    });
    setExpandedSteps((current) => ({ ...current, google: true }));

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('connected');
    const query = nextParams.toString();
    const hash = typeof window === 'undefined' ? '' : window.location.hash;

    router.replace(`${pathname}${query ? `?${query}` : ''}${hash}`, { scroll: false });
  }, [connectedParam, pathname, router, searchParams, toast]);

  const businessSummary = useMemo(() => {
    const contactMethod = businessData.primaryPhone
      ? 'Phone on file'
      : businessData.website
        ? 'Website on file'
        : 'No contact method';

    return {
      service: businessData.vertical,
      timezone: businessData.timezone.replaceAll('_', ' '),
      contactMethod
    };
  }, [businessData.primaryPhone, businessData.timezone, businessData.vertical, businessData.website]);

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

      <GettingStartedChecklist status={status} />

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
      {errorParam === 'invalid-timezone' ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Timezone is invalid. Select one of the available options.
        </div>
      ) : null}
      {errorParam === 'invalid-phone' ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Primary phone is invalid. Enter a valid US phone number.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card id="business-profile" className="scroll-mt-24 bg-card" aria-busy={businessPending}>
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Business profile</h2>
            <p className="text-sm text-muted-foreground">
              Add core business details used for review routing and reply style.
            </p>
          </CardHeader>
          <CardContent>
            {businessComplete && !expandedSteps.business ? (
              <div className="rounded-[1.5rem] bg-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="size-4 text-primary" />
                      Step completed
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Service: {businessSummary.service}</p>
                      <p>Timezone: {businessSummary.timezone}</p>
                      <p>{businessSummary.contactMethod}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setExpandedSteps((current) => ({ ...current, business: true }))}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <SetupBusinessProfileForm
                defaultName={businessData.name}
                defaultService={businessData.vertical}
                defaultTimezone={businessData.timezone.replaceAll('_', ' ')}
                defaultPrimaryPhone={businessData.primaryPhone}
                defaultReviewContactEmail={businessData.reviewContactEmail}
                defaultWebsite={businessData.website}
                formAction={businessFormAction}
                isPending={businessPending}
                serverError={businessServerError}
              />
            )}
          </CardContent>
        </Card>

        <Card id="connect-google" className="scroll-mt-24 bg-card" aria-busy={googlePending}>
          <CardHeader className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Connect Google Business Profile</h2>
            <p className="text-sm text-muted-foreground">
              Link your account and choose at least one location to import reviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {googleComplete && !expandedSteps.google ? (
              <div className="rounded-[1.5rem] bg-muted p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="size-4 text-primary" />
                      Step completed
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Connected to Google ({googleConnectionStatus}).</p>
                      <p>Locations selected: {selectedLocationIdsData.length}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setExpandedSteps((current) => ({ ...current, google: true }))}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {googleServerError ? (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {googleServerError}
                  </div>
                ) : null}
                <div className="rounded-[1.5rem] bg-muted p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Link2 className="size-4 text-primary" />
                    Connection status
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {connectedAccount
                      ? `Connected to Google (${connectedAccount.status}).`
                      : 'No Google account connected yet.'}
                  </p>
                </div>

                {!connectedAccount ? (
                  <form action="/api/integrations/google/start" method="post">
                    <Button className="rounded-full">Connect Google Business Profile</Button>
                  </form>
                ) : (
                  <>
                    <form action={syncNowAction}>
                      <input type="hidden" name="connectedAccountId" value={connectedAccount.id} />
                      <Button variant="outline" className="rounded-full">
                        Sync now
                      </Button>
                    </form>

                    {selectableLocations.length > 0 ? (
                      <form action={googleFormAction} className="space-y-4" aria-busy={googlePending}>
                        <input type="hidden" name="_responseMode" value="inline" />
                        <input type="hidden" name="connectedAccountId" value={connectedAccount.id} />
                        <fieldset disabled={googlePending} className="space-y-4 disabled:opacity-80">
                          <div className="space-y-3">
                            {selectableLocations.map((location) => (
                              <label
                                key={location.externalLocationId}
                                className="flex items-start gap-3 rounded-[1.5rem] bg-muted p-4"
                              >
                                <input
                                  type="checkbox"
                                  name="locationIds"
                                  value={location.externalLocationId}
                                  defaultChecked={selectedLocationIdsData.includes(
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
                          <Button className="rounded-full" disabled={googlePending}>
                            {googlePending ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Saving locations...
                              </>
                            ) : (
                              'Save selected locations'
                            )}
                          </Button>
                        </fieldset>
                      </form>
                    ) : null}
                  </>
                )}

                {connectedAccount && connectedAccount.lastError ? (
                  <p className="text-sm text-destructive">{connectedAccount.lastError}</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="drafting-defaults" className="scroll-mt-24 bg-card" aria-busy={draftingPending}>
        <CardHeader className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">3. Drafting and safety defaults</h2>
          <p className="text-sm text-muted-foreground">
            Configure tone, escalation, and guardrails for reply generation.
          </p>
        </CardHeader>
        <CardContent>
          {draftingComplete && !expandedSteps.drafting ? (
            <div className="rounded-[1.5rem] bg-muted p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    Step completed
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Sign-off: {settingsData.signoffName}</p>
                    <p>Reply style: {settingsData.defaultReplyStyle}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setExpandedSteps((current) => ({ ...current, drafting: true }))}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <form action={draftingFormAction} className="space-y-4" aria-busy={draftingPending}>
              <input type="hidden" name="_responseMode" value="inline" />
              {draftingServerError ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {draftingServerError}
                </div>
              ) : null}
              <fieldset disabled={draftingPending} className="space-y-4 disabled:opacity-80">
                <div>
                  <Label htmlFor="brandVoice">Brand voice</Label>
                  <Textarea
                    id="brandVoice"
                    name="brandVoice"
                    aria-describedby="brandVoice-help"
                    defaultValue={settingsData.brandVoice}
                    placeholder="Friendly, clear, and professional. Acknowledge concerns and offer a next step."
                    className={`${textareaFieldSurfaceClass} rounded-[1.5rem]`}
                  />
                  <p id="brandVoice-help" className="mt-2 text-sm text-muted-foreground">
                    Used as the baseline tone for generated replies.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="signoffName">Sign-off name</Label>
                    <Input
                      id="signoffName"
                      name="signoffName"
                      aria-describedby="signoffName-help"
                      defaultValue={settingsData.signoffName}
                      className={fieldSurfaceClass}
                    />
                    <p id="signoffName-help" className="mt-2 text-sm text-muted-foreground">
                      Appears at the end of approved replies.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="defaultReplyStyle">Default reply style</Label>
                    <Input
                      id="defaultReplyStyle"
                      name="defaultReplyStyle"
                      aria-describedby="defaultReplyStyle-help"
                      defaultValue={settingsData.defaultReplyStyle}
                      placeholder="Professional"
                      className={fieldSurfaceClass}
                    />
                    <p id="defaultReplyStyle-help" className="mt-2 text-sm text-muted-foreground">
                      Choose a consistent style such as Professional, Warm, or Concise.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="escalationMessage">Escalation message</Label>
                  <Textarea
                    id="escalationMessage"
                    name="escalationMessage"
                    aria-describedby="escalationMessage-help"
                    defaultValue={settingsData.escalationMessage}
                    placeholder="Please contact our office so we can review this and help directly."
                    className={`${textareaFieldSurfaceClass} rounded-[1.5rem]`}
                  />
                  <p id="escalationMessage-help" className="mt-2 text-sm text-muted-foreground">
                    Used when a review needs direct offline follow-up.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="allowedPromises">Allowed promises</Label>
                    <Input
                      id="allowedPromises"
                      name="allowedPromises"
                      aria-describedby="allowedPromises-help"
                      defaultValue={settingsData.allowedPromises.join(', ')}
                      placeholder="follow-up call, service check"
                      className={fieldSurfaceClass}
                    />
                    <p id="allowedPromises-help" className="mt-2 text-sm text-muted-foreground">
                      Comma-separated actions the assistant can offer.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="bannedPhrases">Banned phrases</Label>
                    <Input
                      id="bannedPhrases"
                      name="bannedPhrases"
                      aria-describedby="bannedPhrases-help"
                      defaultValue={settingsData.bannedPhrases.join(', ')}
                      placeholder="we admit fault, guaranteed refund"
                      className={fieldSurfaceClass}
                    />
                    <p id="bannedPhrases-help" className="mt-2 text-sm text-muted-foreground">
                      Comma-separated phrases the assistant must avoid.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="notificationEmails">Notification emails</Label>
                    <Input
                      id="notificationEmails"
                      name="notificationEmails"
                      aria-describedby="notificationEmails-help"
                      defaultValue={settingsData.notificationEmails.join(', ')}
                      placeholder="owner@business.com, manager@business.com"
                      className={fieldSurfaceClass}
                    />
                    <p id="notificationEmails-help" className="mt-2 text-sm text-muted-foreground">
                      Comma-separated emails for high-priority alerts.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="manualReviewRules">Manual review rules</Label>
                  <Input
                    id="manualReviewRules"
                    name="manualReviewRules"
                    aria-describedby="manualReviewRules-help"
                    defaultValue={settingsData.manualReviewRules.join(', ')}
                    placeholder="negative review, billing dispute, legal threat"
                    className={fieldSurfaceClass}
                  />
                  <p id="manualReviewRules-help" className="mt-2 text-sm text-muted-foreground">
                    Comma-separated triggers that always require manual review.
                  </p>
                </div>
                <Button className="rounded-full" disabled={draftingPending}>
                  {draftingPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save safety settings'
                  )}
                </Button>
              </fieldset>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardContent className="flex flex-wrap items-center gap-3 px-6 py-5">
          <form action={completeSetupAction}>
            <Button disabled={!status.allComplete} className="rounded-full">
              <CheckCircle2 className="size-4" />
              Mark setup complete
            </Button>
          </form>
          {!status.allComplete ? (
            <p className="text-sm text-muted-foreground">Complete all checklist steps to continue.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              All steps saved. Finish onboarding to access the dashboard.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: MapPinned,
            title: 'Locations selected',
            value: String(selectedLocationIdsData.length)
          },
          {
            icon: Sparkles,
            title: 'Reply style',
            value: settingsData.defaultReplyStyle
          },
          {
            icon: CheckCircle2,
            title: 'Onboarding',
            value: businessData.onboardingCompleted ? 'Complete' : 'In progress'
          }
        ].map((item) => (
          <Card key={item.title} className="bg-card">
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
