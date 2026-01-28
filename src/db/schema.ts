import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// PROJECTS TABLE
// Stores portfolio projects/deployments
// ============================================================================
export const projects = pgTable('projects', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    shortDescription: varchar('short_description', { length: 500 }).notNull(),
    fullDescription: text('full_description').notNull(),
    previewUrl: varchar('preview_url', { length: 500 }),
    specifications: jsonb('specifications').$type<string[]>().default([]),
    techStack: jsonb('tech_stack').$type<string[]>().default([]),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('projects_display_order_idx').on(table.displayOrder),
    publishedIdx: index('projects_published_idx').on(table.isPublished),
}));

// ============================================================================
// SERVICES TABLE
// Stores service capabilities
// ============================================================================
export const services = pgTable('services', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    iconName: varchar('icon_name', { length: 50 }).notNull(),
    inputDescription: text('input_description').notNull(),
    outputDescription: text('output_description').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('services_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// ADDITIONAL CAPABILITIES TABLE
// Stores extra capability badges
// ============================================================================
export const additionalCapabilities = pgTable('additional_capabilities', {
    id: uuid('id').defaultRandom().primaryKey(),
    label: varchar('label', { length: 100 }).notNull(),
    iconName: varchar('icon_name', { length: 50 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('additional_capabilities_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// TECH STACK LAYERS TABLE
// Stores technology stack categories
// ============================================================================
export const techStackLayers = pgTable('tech_stack_layers', {
    id: uuid('id').defaultRandom().primaryKey(),
    layerName: varchar('layer_name', { length: 100 }).notNull(),
    technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('tech_stack_layers_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// TRUST SIGNALS TABLE
// Stores operational signals/trust indicators
// ============================================================================
export const trustSignals = pgTable('trust_signals', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    iconName: varchar('icon_name', { length: 50 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('trust_signals_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// SITE CONFIGURATION TABLE
// Stores key-value site settings
// ============================================================================
export const siteConfiguration = pgTable('site_configuration', {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    keyIdx: uniqueIndex('site_configuration_key_idx').on(table.key),
}));

// ============================================================================
// FORM OPTIONS TABLE
// Stores dropdown options for contact form
// ============================================================================
export const formOptions = pgTable('form_options', {
    id: uuid('id').defaultRandom().primaryKey(),
    optionType: varchar('option_type', { length: 50 }).notNull(), // 'system_type' or 'budget_range'
    optionValue: varchar('option_value', { length: 255 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    typeOrderIdx: index('form_options_type_order_idx').on(table.optionType, table.displayOrder),
}));

// ============================================================================
// CONTACT SUBMISSIONS TABLE
// Stores contact form submissions
// ============================================================================
export const contactSubmissions = pgTable('contact_submissions', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    projectType: varchar('project_type', { length: 100 }).notNull(),
    budget: varchar('budget', { length: 100 }).notNull(),
    timeline: varchar('timeline', { length: 100 }),
    message: text('message').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('new'), // new, in_progress, completed, archived
    isRead: boolean('is_read').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    statusIdx: index('contact_submissions_status_idx').on(table.status),
    createdAtIdx: index('contact_submissions_created_at_idx').on(table.createdAt),
    archivedIdx: index('contact_submissions_archived_idx').on(table.isArchived),
}));

// ============================================================================
// CLIENT FIT ITEMS TABLE
// Stores compatible/incompatible criteria
// ============================================================================
export const clientFitItems = pgTable('client_fit_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 20 }).notNull(), // 'compatible' or 'incompatible'
    text: text('text').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    typeIdx: index('client_fit_items_type_idx').on(table.type),
    displayOrderIdx: index('client_fit_items_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// PROCESS STEPS TABLE
// Stores execution phases
// ============================================================================
export const processSteps = pgTable('process_steps', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    iconName: varchar('icon_name', { length: 50 }).notNull(),
    duration: varchar('duration', { length: 100 }).notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('process_steps_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// ABOUT ITEMS TABLE
// Stores values/principles
// ============================================================================
export const aboutItems = pgTable('about_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    displayOrderIdx: index('about_items_display_order_idx').on(table.displayOrder),
}));

// ============================================================================
// ADMIN USERS TABLE
// Stores admin user accounts (Phase 2)
// ============================================================================

// Permission categories for role-based access control
export interface UserPermissions {
    dashboard: boolean;
    projects: boolean;
    services: boolean;
    capabilities: boolean;
    clientFit: boolean;
    process: boolean;
    about: boolean;
    techStack: boolean;
    trustSignals: boolean;
    media: boolean;
    inbox: boolean;
    siteConfig: boolean;
    formOptions: boolean;
    users: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
    dashboard: true,
    projects: false,
    services: false,
    capabilities: false,
    clientFit: false,
    process: false,
    about: false,
    techStack: false,
    trustSignals: false,
    media: false,
    inbox: false,
    siteConfig: false,
    formOptions: false,
    users: false,
};

export const SUPER_ADMIN_PERMISSIONS: UserPermissions = {
    dashboard: true,
    projects: true,
    services: true,
    capabilities: true,
    clientFit: true,
    process: true,
    about: true,
    techStack: true,
    trustSignals: true,
    media: true,
    inbox: true,
    siteConfig: true,
    formOptions: true,
    users: true,
};

export const adminUsers = pgTable('admin_users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('admin'), // super_admin, admin

    // Account status: pending (awaiting approval), active, suspended
    status: varchar('status', { length: 20 }).notNull().default('pending'),

    // Permissions for role-based access control
    permissions: jsonb('permissions').$type<UserPermissions>().notNull().default(DEFAULT_PERMISSIONS),

    // Email verification
    isEmailVerified: boolean('is_email_verified').notNull().default(false),
    emailVerifyToken: varchar('email_verify_token', { length: 10 }),
    emailVerifyExpires: timestamp('email_verify_expires'),

    // Password reset
    passwordResetToken: varchar('password_reset_token', { length: 100 }),
    passwordResetExpires: timestamp('password_reset_expires'),

    lastLogin: timestamp('last_login'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    emailIdx: uniqueIndex('admin_users_email_idx').on(table.email),
    statusIdx: index('admin_users_status_idx').on(table.status),
}));

// ============================================================================
// MEDIA UPLOADS TABLE
// Stores uploaded file metadata (Phase 6)
// ============================================================================
export const mediaUploads = pgTable('media_uploads', {
    id: uuid('id').defaultRandom().primaryKey(),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    storagePath: varchar('storage_path', { length: 500 }).notNull(),
    uploadedBy: uuid('uploaded_by').references(() => adminUsers.id),
    usageRefs: jsonb('usage_refs').$type<{ entity: string; entityId: string; }[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    uploadedByIdx: index('media_uploads_uploaded_by_idx').on(table.uploadedBy),
}));

// ============================================================================
// RELATIONS
// ============================================================================
export const mediaUploadsRelations = relations(mediaUploads, ({ one }) => ({
    uploader: one(adminUsers, {
        fields: [mediaUploads.uploadedBy],
        references: [adminUsers.id],
    }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type AdditionalCapability = typeof additionalCapabilities.$inferSelect;
export type NewAdditionalCapability = typeof additionalCapabilities.$inferInsert;

export type TechStackLayer = typeof techStackLayers.$inferSelect;
export type NewTechStackLayer = typeof techStackLayers.$inferInsert;

export type TrustSignal = typeof trustSignals.$inferSelect;
export type NewTrustSignal = typeof trustSignals.$inferInsert;

export type SiteConfig = typeof siteConfiguration.$inferSelect;
export type NewSiteConfig = typeof siteConfiguration.$inferInsert;

export type FormOption = typeof formOptions.$inferSelect;
export type NewFormOption = typeof formOptions.$inferInsert;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type NewContactSubmission = typeof contactSubmissions.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export type MediaUpload = typeof mediaUploads.$inferSelect;
export type NewMediaUpload = typeof mediaUploads.$inferInsert;

export type ClientFitItem = typeof clientFitItems.$inferSelect;
export type NewClientFitItem = typeof clientFitItems.$inferInsert;

export type ProcessStep = typeof processSteps.$inferSelect;
export type NewProcessStep = typeof processSteps.$inferInsert;

export type AboutItem = typeof aboutItems.$inferSelect;
export type NewAboutItem = typeof aboutItems.$inferInsert;
