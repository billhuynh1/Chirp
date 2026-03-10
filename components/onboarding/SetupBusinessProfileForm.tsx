'use client';

import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServiceAutocompleteInput } from '@/components/onboarding/ServiceAutocompleteInput';
import { TimezoneAutocompleteInput } from '@/components/onboarding/TimezoneAutocompleteInput';
import {
  ACTIVE_SERVICE_VALUES,
  COMING_SOON_SERVICE_LABELS,
  TIMEZONE_SUGGESTION_LABELS,
  formatUsPhoneInput,
  isAllowedTimezoneValue,
  isValidFullUrlValue,
  isValidUsPhoneValue
} from '@/lib/validation/business-profile';

type FieldName =
  | 'name'
  | 'vertical'
  | 'timezone'
  | 'primaryPhone'
  | 'reviewContactEmail'
  | 'website';

type SetupBusinessProfileFormProps = {
  defaultName: string;
  defaultService: string;
  defaultTimezone: string;
  defaultPrimaryPhone: string;
  defaultReviewContactEmail: string;
  defaultWebsite: string;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  serverError?: string;
};

const fieldSurfaceClass =
  'mt-2 rounded-2xl border border-border/70 bg-muted/70 shadow-none placeholder:text-muted-foreground/80 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/60';

function readField(formData: FormData, field: FieldName) {
  return String(formData.get(field) ?? '').trim();
}

function validateField(field: FieldName, value: string) {
  switch (field) {
    case 'name': {
      if (!value) {
        return 'Business name is required.';
      }
      if (value.length < 2 || value.length > 160) {
        return 'Business name must be between 2 and 160 characters.';
      }
      return '';
    }
    case 'vertical': {
      if (!value) {
        return 'Service is required.';
      }

      const normalized = value.toLowerCase();
      if (!ACTIVE_SERVICE_VALUES.includes(normalized as (typeof ACTIVE_SERVICE_VALUES)[number])) {
        return 'Select a service from the available options.';
      }
      return '';
    }
    case 'timezone': {
      if (!value) {
        return 'Timezone is required.';
      }
      if (!isAllowedTimezoneValue(value)) {
        return 'Select a timezone from the available options.';
      }
      return '';
    }
    case 'primaryPhone': {
      if (!value) {
        return '';
      }
      if (!isValidUsPhoneValue(value)) {
        return 'Enter a valid US phone number.';
      }
      return '';
    }
    case 'reviewContactEmail': {
      if (!value) {
        return '';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Enter a valid email address.';
      }
      return '';
    }
    case 'website': {
      if (!value) {
        return '';
      }
      if (!isValidFullUrlValue(value)) {
        return 'Enter a full URL starting with http:// or https://.';
      }
      return '';
    }
    default:
      return '';
  }
}

function validateFormData(formData: FormData) {
  const fields: FieldName[] = [
    'name',
    'vertical',
    'timezone',
    'primaryPhone',
    'reviewContactEmail',
    'website'
  ];

  return fields.reduce<Record<FieldName, string>>(
    (acc, field) => {
      acc[field] = validateField(field, readField(formData, field));
      return acc;
    },
    {
      name: '',
      vertical: '',
      timezone: '',
      primaryPhone: '',
      reviewContactEmail: '',
      website: ''
    }
  );
}

function setFieldValidity(form: HTMLFormElement, field: FieldName, message: string) {
  const element = form.elements.namedItem(field);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.setCustomValidity(message);
  }
}

export function SetupBusinessProfileForm({
  defaultName,
  defaultService,
  defaultTimezone,
  defaultPrimaryPhone,
  defaultReviewContactEmail,
  defaultWebsite,
  formAction,
  isPending,
  serverError
}: SetupBusinessProfileFormProps) {
  const [primaryPhoneValue, setPrimaryPhoneValue] = useState(() =>
    formatUsPhoneInput(defaultPrimaryPhone)
  );
  const [errors, setErrors] = useState<Record<FieldName, string>>({
    name: '',
    vertical: '',
    timezone: '',
    primaryPhone: '',
    reviewContactEmail: '',
    website: ''
  });

  const onFieldBlur = (field: FieldName) => (event: FocusEvent<HTMLInputElement>) => {
    const element = event.currentTarget;
    const message = validateField(field, element.value.trim());
    element.setCustomValidity(message);
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const onInvalid = (field: FieldName) => (event: FormEvent<HTMLInputElement>) => {
    const element = event.currentTarget;
    const message = element.validationMessage || 'Invalid value.';
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextErrors = validateFormData(formData);
    setErrors(nextErrors);

    (Object.keys(nextErrors) as FieldName[]).forEach((field) => {
      setFieldValidity(form, field, nextErrors[field]);
    });

    const hasErrors = (Object.values(nextErrors) as string[]).some(Boolean);
    if (hasErrors || !form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
    }
  };

  const onPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    setPrimaryPhoneValue(formatUsPhoneInput(input.value));
    input.setCustomValidity('');
    setErrors((prev) => ({ ...prev, primaryPhone: '' }));
  };

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4" aria-busy={isPending}>
      <input type="hidden" name="_responseMode" value="inline" />
      {serverError ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-[1.25rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      ) : null}
      <fieldset disabled={isPending} className="space-y-4 disabled:opacity-80">
        <div>
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={defaultName}
            aria-describedby="name-error"
            aria-invalid={Boolean(errors.name)}
            onBlur={onFieldBlur('name')}
            onInvalid={onInvalid('name')}
            className={fieldSurfaceClass}
          />
          <p id="name-error" aria-live="polite" className="mt-1 text-sm text-destructive">
            {errors.name}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="vertical">Service</Label>
            <ServiceAutocompleteInput
              id="vertical"
              name="vertical"
              required
              defaultValue={defaultService}
              suggestions={[...ACTIVE_SERVICE_VALUES]}
              comingSoon={COMING_SOON_SERVICE_LABELS}
              placeholder="Type to search services"
              ariaDescribedBy="service-help vertical-error"
              ariaInvalid={Boolean(errors.vertical)}
              onBlur={onFieldBlur('vertical')}
              onInvalid={onInvalid('vertical')}
              className={fieldSurfaceClass}
            />
            <p id="service-help" className="mt-2 text-sm text-muted-foreground">
              Currently available: plumbing.
            </p>
            <p id="vertical-error" aria-live="polite" className="mt-1 text-sm text-destructive">
              {errors.vertical}
            </p>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <TimezoneAutocompleteInput
              id="timezone"
              name="timezone"
              required
              defaultValue={defaultTimezone}
              suggestions={TIMEZONE_SUGGESTION_LABELS}
              ariaDescribedBy="timezone-error"
              ariaInvalid={Boolean(errors.timezone)}
              onBlur={onFieldBlur('timezone')}
              onInvalid={onInvalid('timezone')}
              className={fieldSurfaceClass}
            />
            <p id="timezone-error" aria-live="polite" className="mt-1 text-sm text-destructive">
              {errors.timezone}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="primaryPhone">Primary phone</Label>
            <Input
              id="primaryPhone"
              name="primaryPhone"
              value={primaryPhoneValue}
              placeholder="(555) 123-4567"
              pattern={'^(?:\\+?1[\\s.\\-]?)?(?:\\(?\\d{3}\\)?[\\s.\\-]?)\\d{3}[\\s.\\-]?\\d{4}$'}
              title="Enter a valid US phone number."
              aria-describedby="primaryPhone-error"
              aria-invalid={Boolean(errors.primaryPhone)}
              onChange={onPhoneChange}
              onBlur={onFieldBlur('primaryPhone')}
              onInvalid={onInvalid('primaryPhone')}
              className={fieldSurfaceClass}
            />
            <p id="primaryPhone-error" aria-live="polite" className="mt-1 text-sm text-destructive">
              {errors.primaryPhone}
            </p>
          </div>
          <div>
            <Label htmlFor="reviewContactEmail">Review contact email</Label>
            <Input
              id="reviewContactEmail"
              name="reviewContactEmail"
              type="email"
              defaultValue={defaultReviewContactEmail}
              placeholder="reviews@yourbusiness.com"
              aria-describedby="reviewContactEmail-error"
              aria-invalid={Boolean(errors.reviewContactEmail)}
              onBlur={onFieldBlur('reviewContactEmail')}
              onInvalid={onInvalid('reviewContactEmail')}
              className={fieldSurfaceClass}
            />
            <p
              id="reviewContactEmail-error"
              aria-live="polite"
              className="mt-1 text-sm text-destructive"
            >
              {errors.reviewContactEmail}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={defaultWebsite}
            placeholder="https://yourbusiness.com"
            aria-describedby="website-error"
            aria-invalid={Boolean(errors.website)}
            onBlur={onFieldBlur('website')}
            onInvalid={onInvalid('website')}
            className={fieldSurfaceClass}
          />
          <p id="website-error" aria-live="polite" className="mt-1 text-sm text-destructive">
            {errors.website}
          </p>
        </div>

        <Button className="rounded-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </fieldset>
    </form>
  );
}
