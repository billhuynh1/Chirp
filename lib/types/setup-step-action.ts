export type SetupStepId = 'business-profile' | 'google-locations' | 'drafting-defaults';

export type SetupOnboardingSnapshot = {
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  stepCompletion: {
    businessProfile: boolean;
    googleLocations: boolean;
    draftingDefaults: boolean;
  };
};

export type SetupStepSummary = {
  business?: {
    service: string;
    timezone: string;
    primaryPhone: string | null;
    website: string | null;
  };
  google?: {
    selectedLocationIds: string[];
    selectedLocationsCount: number;
    connectionStatus: string;
  };
  drafting?: {
    signoffName: string;
    defaultReplyStyle: string;
    draftGenerationMode: string;
    focusQueueEnabled?: boolean;
  };
};

export type SetupStepActionSuccess = {
  ok: true;
  step: SetupStepId;
  onboarding: SetupOnboardingSnapshot;
  summary?: SetupStepSummary;
};

export type SetupStepActionError = {
  ok: false;
  step: SetupStepId;
  errorCode:
    | 'invalid-input'
    | 'invalid-service'
    | 'invalid-timezone'
    | 'invalid-phone'
    | 'invalid-locations'
    | 'server-error';
  message: string;
  onboarding: SetupOnboardingSnapshot;
};

export type SetupStepActionResult = SetupStepActionSuccess | SetupStepActionError;
