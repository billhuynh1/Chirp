import { redirect } from 'next/navigation';
import { ServiceAutocompleteInput } from '@/components/onboarding/ServiceAutocompleteInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  ACTIVE_SERVICE_VALUES,
  COMING_SOON_SERVICE_LABELS,
  getServiceDisplayLabel
} from '@/lib/validation/business-profile';
import {
  saveBusinessProfileAction,
  saveBusinessSettingsAction
} from '../../actions';

export default async function SettingsPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business || !workspace.settings) {
    redirect('/sign-in');
  }

  const saveBusinessProfileFormAction = saveBusinessProfileAction as unknown as (
    formData: FormData
  ) => Promise<void>;
  const saveBusinessSettingsFormAction = saveBusinessSettingsAction as unknown as (
    formData: FormData
  ) => Promise<void>;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6">
        <p className="text-warning text-xs font-semibold uppercase tracking-[0.24em]">
          Settings
        </p>
        <h1 className="text-foreground mt-3 text-3xl font-semibold">
          Business voice and safety rules
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveBusinessProfileFormAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" defaultValue={workspace.business.name} className="mt-2 rounded-2xl" />
              </div>
              <div>
                <Label htmlFor="vertical">Service niche</Label>
                <ServiceAutocompleteInput
                  id="vertical"
                  name="vertical"
                  required
                  defaultValue={getServiceDisplayLabel(workspace.business.vertical)}
                  suggestions={ACTIVE_SERVICE_VALUES.map((service) =>
                    getServiceDisplayLabel(service)
                  )}
                  comingSoon={COMING_SOON_SERVICE_LABELS}
                  placeholder="Choose your service"
                  className="rounded-2xl border border-border/70 bg-muted/70 shadow-none"
                />
              </div>
              <div>
                <Label htmlFor="primaryPhone">Primary phone</Label>
                <Input id="primaryPhone" name="primaryPhone" defaultValue={workspace.business.primaryPhone ?? ''} className="mt-2 rounded-2xl" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={workspace.business.website ?? ''} className="mt-2 rounded-2xl" />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue={workspace.business.timezone} className="mt-2 rounded-2xl" />
              </div>
              <div>
                <Label htmlFor="reviewContactEmail">Review contact email</Label>
                <Input id="reviewContactEmail" name="reviewContactEmail" type="email" defaultValue={workspace.business.reviewContactEmail ?? workspace.user.email} className="mt-2 rounded-2xl" />
              </div>
              <FormSubmitButton
                className="rounded-full"
                pendingText="Saving profile..."
                successToastMessage="Business profile saved"
              >
                Save profile
              </FormSubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Draft rules</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              key={`${workspace.settings.updatedAt.toISOString()}:${workspace.settings.draftGenerationMode}:${workspace.settings.focusQueueEnabled ? '1' : '0'}`}
              action={saveBusinessSettingsFormAction}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="brandVoice">Brand voice</Label>
                <Textarea id="brandVoice" name="brandVoice" defaultValue={workspace.settings.brandVoice} className="mt-2 rounded-[1.5rem]" />
              </div>
              <div>
                <Label htmlFor="escalationMessage">Escalation message</Label>
                <Textarea id="escalationMessage" name="escalationMessage" defaultValue={workspace.settings.escalationMessage} className="mt-2 rounded-[1.5rem]" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="signoffName">Sign-off name</Label>
                  <Input id="signoffName" name="signoffName" defaultValue={workspace.settings.signoffName} className="mt-2 rounded-2xl" />
                </div>
                <div>
                  <Label htmlFor="defaultReplyStyle">Default reply style</Label>
                  <Input id="defaultReplyStyle" name="defaultReplyStyle" defaultValue={workspace.settings.defaultReplyStyle} className="mt-2 rounded-2xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="draftGenerationMode">Draft generation mode</Label>
                <select
                  id="draftGenerationMode"
                  name="draftGenerationMode"
                  defaultValue={workspace.settings.draftGenerationMode}
                  className="mt-2 h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                >
                  <option value="hybrid_risk_gated">Hybrid risk-gated</option>
                  <option value="manual_only">Manual only</option>
                </select>
              </div>
              <div>
                <Label htmlFor="focusQueueEnabled">Focus Queue beta</Label>
                <select
                  id="focusQueueEnabled"
                  name="focusQueueEnabled"
                  defaultValue={workspace.settings.focusQueueEnabled ? 'true' : 'false'}
                  className="mt-2 h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="allowedPromises">Allowed promises</Label>
                  <Input id="allowedPromises" name="allowedPromises" defaultValue={workspace.settings.allowedPromises.join(', ')} className="mt-2 rounded-2xl" />
                </div>
                <div>
                  <Label htmlFor="bannedPhrases">Banned phrases</Label>
                  <Input id="bannedPhrases" name="bannedPhrases" defaultValue={workspace.settings.bannedPhrases.join(', ')} className="mt-2 rounded-2xl" />
                </div>
                <div>
                  <Label htmlFor="notificationEmails">Notification emails</Label>
                  <Input id="notificationEmails" name="notificationEmails" defaultValue={workspace.settings.notificationEmails.join(', ')} className="mt-2 rounded-2xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="manualReviewRules">Manual review rules</Label>
                <Input id="manualReviewRules" name="manualReviewRules" defaultValue={workspace.settings.manualReviewRules.join(', ')} className="mt-2 rounded-2xl" />
              </div>
              <FormSubmitButton
                className="rounded-full"
                pendingText="Saving settings..."
                successToastMessage="Draft rules saved"
              >
                Save settings
              </FormSubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
