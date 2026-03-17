export const ACTIVE_SERVICE_VALUES = [
  'plumbing',
  'hvac',
  'electrical',
  'roofing'
] as const;

export const COMING_SOON_SERVICE_LABELS = [] as const;

export const SERVICE_LABELS = {
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  roofing: 'Roofing'
} as const;

const SERVICE_ALIASES = {
  plumbing: 'plumbing',
  plumber: 'plumbing',
  hvac: 'hvac',
  'heating and cooling': 'hvac',
  electrical: 'electrical',
  electrician: 'electrical',
  roofing: 'roofing',
  roofer: 'roofing'
} as const;

export const ALLOWED_TIMEZONE_VALUES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC'
] as const;

export const TIMEZONE_SUGGESTION_LABELS = ALLOWED_TIMEZONE_VALUES.map((timezone) =>
  timezone.replaceAll('_', ' ')
);

export function normalizeServiceValue(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  return SERVICE_ALIASES[normalized as keyof typeof SERVICE_ALIASES] ?? null;
}

export function getServiceDisplayLabel(input: string | null | undefined) {
  const normalized = normalizeServiceValue(input);
  if (!normalized) {
    return '';
  }

  return SERVICE_LABELS[normalized];
}

export function normalizeTimezoneValue(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  return input.trim().replaceAll(' ', '_');
}

export function isAllowedTimezoneValue(input: string | null | undefined) {
  const normalized = normalizeTimezoneValue(input);
  if (!normalized) {
    return false;
  }

  return ALLOWED_TIMEZONE_VALUES.includes(
    normalized as (typeof ALLOWED_TIMEZONE_VALUES)[number]
  );
}

export function normalizeUsPhoneToE164(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^[+\d().\-\s]+$/.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

export function isValidUsPhoneValue(input: string | null | undefined) {
  if (!input || !input.trim()) {
    return true;
  }

  return normalizeUsPhoneToE164(input) !== null;
}

function formatUsLocalPhoneDigits(digits: string) {
  if (digits.length === 0) {
    return '';
  }
  if (digits.length < 4) {
    return `(${digits}`;
  }
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function formatUsPhoneInput(input: string | null | undefined) {
  if (!input) {
    return '';
  }

  const raw = input.trim();
  if (!raw) {
    return '';
  }

  let digits = raw.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    const localDigits = digits.slice(1);
    return `+1 ${formatUsLocalPhoneDigits(localDigits)}`.trim();
  }

  return formatUsLocalPhoneDigits(digits.slice(0, 10));
}

export function isValidFullUrlValue(input: string | null | undefined) {
  if (!input || !input.trim()) {
    return true;
  }

  try {
    const parsed = new URL(input.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
