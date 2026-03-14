import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

type JsonArray = string[];

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    googleSub: varchar('google_sub', { length: 255 }).unique(),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt)
  })
);

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 })
});

export const teamMembers = pgTable(
  'team_members',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    role: varchar('role', { length: 50 }).notNull(),
    joinedAt: timestamp('joined_at').notNull().defaultNow()
  },
  (table) => ({
    userTeamUnique: uniqueIndex('team_members_user_team_unique').on(
      table.userId,
      table.teamId
    ),
    teamIdx: index('team_members_team_idx').on(table.teamId)
  })
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id').references(() => users.id),
    action: text('action').notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    ipAddress: varchar('ip_address', { length: 45 })
  },
  (table) => ({
    teamTimestampIdx: index('activity_logs_team_timestamp_idx').on(
      table.teamId,
      table.timestamp
    )
  })
);

export const invitations = pgTable(
  'invitations',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    invitedBy: integer('invited_by')
      .notNull()
      .references(() => users.id),
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('pending')
  },
  (table) => ({
    teamEmailStatusIdx: index('invitations_team_email_status_idx').on(
      table.teamId,
      table.email,
      table.status
    )
  })
);

export const businesses = pgTable(
  'businesses',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 160 }).notNull(),
    vertical: varchar('vertical', { length: 80 }).notNull().default('plumbing'),
    primaryPhone: varchar('primary_phone', { length: 40 }),
    website: varchar('website', { length: 255 }),
    timezone: varchar('timezone', { length: 80 }).notNull().default('America/Los_Angeles'),
    reviewContactEmail: varchar('review_contact_email', { length: 255 }),
    status: varchar('status', { length: 30 }).notNull().default('trial'),
    onboardingCompletedAt: timestamp('onboarding_completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    teamUnique: uniqueIndex('businesses_team_unique').on(table.teamId),
    statusIdx: index('businesses_status_idx').on(table.status)
  })
);

export const businessSettings = pgTable(
  'business_settings',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id),
    brandVoice: text('brand_voice').notNull().default('Helpful, calm, and professional.'),
    signoffName: varchar('signoff_name', { length: 120 }).notNull().default('The Team'),
    escalationMessage: text('escalation_message')
      .notNull()
      .default('Please contact our office so we can review the details directly.'),
    allowedPromises: jsonb('allowed_promises').$type<JsonArray>().notNull().default([]),
    bannedPhrases: jsonb('banned_phrases').$type<JsonArray>().notNull().default([]),
    notificationEmails: jsonb('notification_emails').$type<JsonArray>().notNull().default([]),
    defaultReplyStyle: varchar('default_reply_style', { length: 50 })
      .notNull()
      .default('professional'),
    draftGenerationMode: varchar('draft_generation_mode', { length: 40 })
      .notNull()
      .default('hybrid_risk_gated'),
    focusQueueEnabled: boolean('focus_queue_enabled').notNull().default(false),
    language: varchar('language', { length: 20 }).notNull().default('en'),
    manualReviewRules: jsonb('manual_review_rules')
      .$type<JsonArray>()
      .notNull()
      .default(['negative_reviews', 'damage_claim', 'safety_concern']),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    businessUnique: uniqueIndex('business_settings_business_unique').on(
      table.businessId
    )
  })
);

export const connectedAccounts = pgTable(
  'connected_accounts',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id),
    provider: varchar('provider', { length: 50 }).notNull(),
    externalAccountId: varchar('external_account_id', { length: 255 }).notNull(),
    accessTokenEncrypted: text('access_token_encrypted'),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    expiresAt: timestamp('expires_at'),
    scope: text('scope'),
    status: varchar('status', { length: 30 }).notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at'),
    lastError: text('last_error'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    providerExternalUnique: uniqueIndex('connected_accounts_provider_external_unique').on(
      table.provider,
      table.externalAccountId
    ),
    businessStatusIdx: index('connected_accounts_business_status_idx').on(
      table.businessId,
      table.status
    )
  })
);

export const locations = pgTable(
  'locations',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id),
    connectedAccountId: integer('connected_account_id').references(
      () => connectedAccounts.id
    ),
    externalLocationId: varchar('external_location_id', { length: 255 }).notNull(),
    googleAccountName: varchar('google_account_name', { length: 255 }),
    name: varchar('name', { length: 160 }).notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 40 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    status: varchar('status', { length: 30 }).notNull().default('active'),
    selectedAt: timestamp('selected_at').notNull().defaultNow(),
    lastSyncedAt: timestamp('last_synced_at'),
    syncError: text('sync_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    businessLocationUnique: uniqueIndex('locations_business_external_unique').on(
      table.businessId,
      table.externalLocationId
    ),
    businessStatusIdx: index('locations_business_status_idx').on(
      table.businessId,
      table.status
    ),
    syncIdx: index('locations_status_last_synced_idx').on(
      table.status,
      table.lastSyncedAt
    )
  })
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id),
    provider: varchar('provider', { length: 50 }).notNull().default('google_business_profile'),
    externalReviewId: varchar('external_review_id', { length: 255 }).notNull(),
    reviewerName: varchar('reviewer_name', { length: 255 }),
    reviewerPhotoUrl: text('reviewer_photo_url'),
    starRating: integer('star_rating').notNull(),
    reviewText: text('review_text'),
    reviewCreatedAt: timestamp('review_created_at').notNull(),
    reviewUpdatedAt: timestamp('review_updated_at').notNull(),
    ownerReplyText: text('owner_reply_text'),
    ownerReplyUpdatedAt: timestamp('owner_reply_updated_at'),
    hasOwnerReply: boolean('has_owner_reply').notNull().default(false),
    sourceUrl: text('source_url'),
    payloadHash: varchar('payload_hash', { length: 128 }).notNull(),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull().default({}),
    workflowStatus: varchar('workflow_status', { length: 40 }).notNull().default('new'),
    priority: varchar('priority', { length: 20 }).notNull().default('low'),
    needsAttention: boolean('needs_attention').notNull().default(false),
    assignedUserId: integer('assigned_user_id').references(() => users.id),
    escalatedAt: timestamp('escalated_at'),
    lastProcessedAt: timestamp('last_processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    providerReviewUnique: uniqueIndex('reviews_provider_external_location_unique').on(
      table.provider,
      table.externalReviewId,
      table.locationId
    ),
    locationCreatedIdx: index('reviews_location_created_idx').on(
      table.locationId,
      table.reviewCreatedAt
    ),
    workflowIdx: index('reviews_workflow_priority_idx').on(
      table.workflowStatus,
      table.priority
    )
  })
);

export const reviewAnalysis = pgTable(
  'review_analysis',
  {
    id: serial('id').primaryKey(),
    reviewId: integer('review_id')
      .notNull()
      .references(() => reviews.id),
    sentiment: varchar('sentiment', { length: 30 }).notNull(),
    urgency: varchar('urgency', { length: 30 }).notNull(),
    riskLevel: varchar('risk_level', { length: 30 }).notNull(),
    issueTags: jsonb('issue_tags').$type<JsonArray>().notNull().default([]),
    summary: text('summary').notNull(),
    actionRecommendation: varchar('action_recommendation', { length: 80 }).notNull(),
    confidence: integer('confidence').notNull().default(0),
    requiresManualReview: boolean('requires_manual_review').notNull().default(false),
    analysisVersion: integer('analysis_version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    rawOutput: jsonb('raw_output').$type<Record<string, unknown>>().notNull().default({}),
    modelName: varchar('model_name', { length: 120 }).notNull().default('rules-v1'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    reviewActiveIdx: index('review_analysis_review_active_idx').on(
      table.reviewId,
      table.isActive
    ),
    reviewVersionIdx: index('review_analysis_review_version_idx').on(
      table.reviewId,
      table.analysisVersion
    )
  })
);

export const replyDrafts = pgTable(
  'reply_drafts',
  {
    id: serial('id').primaryKey(),
    reviewId: integer('review_id')
      .notNull()
      .references(() => reviews.id),
    analysisId: integer('analysis_id')
      .notNull()
      .references(() => reviewAnalysis.id),
    draftText: text('draft_text').notNull(),
    tone: varchar('tone', { length: 50 }).notNull().default('professional'),
    ctaType: varchar('cta_type', { length: 50 }).notNull().default('none'),
    safetyNotes: jsonb('safety_notes').$type<JsonArray>().notNull().default([]),
    generationMetadata: jsonb('generation_metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    generationReason: varchar('generation_reason', { length: 80 })
      .notNull()
      .default('initial'),
    draftStatus: varchar('draft_status', { length: 40 }).notNull().default('generated'),
    rejectedReason: text('rejected_reason'),
    approvedByUserId: integer('approved_by_user_id').references(() => users.id),
    approvedAt: timestamp('approved_at'),
    postedAt: timestamp('posted_at'),
    postedText: text('posted_text'),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    reviewVersionIdx: uniqueIndex('reply_drafts_review_version_unique').on(
      table.reviewId,
      table.version
    ),
    reviewActiveIdx: index('reply_drafts_review_active_idx').on(
      table.reviewId,
      table.isActive
    )
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id),
    reviewId: integer('review_id').references(() => reviews.id),
    type: varchar('type', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 30 }).notNull().default('email'),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    sentAt: timestamp('sent_at'),
    error: text('error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    businessStatusIdx: index('notifications_business_status_idx').on(
      table.businessId,
      table.status
    )
  })
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id),
    userId: integer('user_id').references(() => users.id),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id').notNull(),
    action: varchar('action', { length: 80 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    businessCreatedIdx: index('audit_logs_business_created_idx').on(
      table.businessId,
      table.createdAt
    ),
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId)
  })
);

export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    jobType: varchar('job_type', { length: 50 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    runAfter: timestamp('run_after').notNull().defaultNow(),
    lockedAt: timestamp('locked_at'),
    completedAt: timestamp('completed_at'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    idempotencyUnique: uniqueIndex('jobs_idempotency_unique').on(
      table.idempotencyKey
    ),
    statusRunAfterIdx: index('jobs_status_run_after_idx').on(
      table.status,
      table.runAfter
    )
  })
);

export const teamsRelations = relations(teams, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  business: one(businesses)
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  replyDraftApprovals: many(replyDrafts),
  auditLogs: many(auditLogs)
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id]
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id]
  })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id]
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id]
  })
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id]
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id]
  })
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  team: one(teams, {
    fields: [businesses.teamId],
    references: [teams.id]
  }),
  settings: one(businessSettings),
  locations: many(locations),
  connectedAccounts: many(connectedAccounts),
  notifications: many(notifications),
  auditLogs: many(auditLogs)
}));

export const businessSettingsRelations = relations(
  businessSettings,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessSettings.businessId],
      references: [businesses.id]
    })
  })
);

export const connectedAccountsRelations = relations(
  connectedAccounts,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [connectedAccounts.businessId],
      references: [businesses.id]
    }),
    locations: many(locations)
  })
);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  business: one(businesses, {
    fields: [locations.businessId],
    references: [businesses.id]
  }),
  connectedAccount: one(connectedAccounts, {
    fields: [locations.connectedAccountId],
    references: [connectedAccounts.id]
  }),
  reviews: many(reviews)
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  location: one(locations, {
    fields: [reviews.locationId],
    references: [locations.id]
  }),
  assignedUser: one(users, {
    fields: [reviews.assignedUserId],
    references: [users.id]
  }),
  analyses: many(reviewAnalysis),
  drafts: many(replyDrafts),
  notifications: many(notifications)
}));

export const reviewAnalysisRelations = relations(
  reviewAnalysis,
  ({ one, many }) => ({
    review: one(reviews, {
      fields: [reviewAnalysis.reviewId],
      references: [reviews.id]
    }),
    drafts: many(replyDrafts)
  })
);

export const replyDraftsRelations = relations(replyDrafts, ({ one }) => ({
  review: one(reviews, {
    fields: [replyDrafts.reviewId],
    references: [reviews.id]
  }),
  analysis: one(reviewAnalysis, {
    fields: [replyDrafts.analysisId],
    references: [reviewAnalysis.id]
  }),
  approvedByUser: one(users, {
    fields: [replyDrafts.approvedByUserId],
    references: [users.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  business: one(businesses, {
    fields: [notifications.businessId],
    references: [businesses.id]
  }),
  review: one(reviews, {
    fields: [notifications.reviewId],
    references: [reviews.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  team: one(teams, {
    fields: [auditLogs.teamId],
    references: [teams.id]
  }),
  business: one(businesses, {
    fields: [auditLogs.businessId],
    references: [businesses.id]
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type NewBusinessSettings = typeof businessSettings.$inferInsert;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type NewConnectedAccount = typeof connectedAccounts.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewAnalysis = typeof reviewAnalysis.$inferSelect;
export type NewReviewAnalysis = typeof reviewAnalysis.$inferInsert;
export type ReplyDraft = typeof replyDrafts.$inferSelect;
export type NewReplyDraft = typeof replyDrafts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
  COMPLETE_ONBOARDING = 'COMPLETE_ONBOARDING',
  CONNECT_GOOGLE = 'CONNECT_GOOGLE',
  SYNC_REVIEWS = 'SYNC_REVIEWS',
  APPROVE_DRAFT = 'APPROVE_DRAFT',
  REJECT_DRAFT = 'REJECT_DRAFT',
  MARK_POSTED = 'MARK_POSTED'
}
