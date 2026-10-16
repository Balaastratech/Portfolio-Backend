import { z } from 'zod';

// ============================================================================
// v2 content model (docs/v2-spec/content-model.md). zod is the source of truth;
// the TypeScript types below are inferred from it so they cannot drift.
// ============================================================================

const httpsUrl = z.string().trim().url().refine((u) => u.startsWith('https://'), 'URL must start with https://');
// Images/videos: an https URL (Cloudinary, YouTube…) or a path served by the site itself ("/demos/x.png").
const assetUrl = z.string().trim().refine((u) => /^https:\/\/\S+$/.test(u) || /^\/(?!\/)\S*$/.test(u),
    'Must be an https:// URL or a site path starting with /');
const id = z.string().trim().min(1).max(64);

export const PROJECT_STATUSES = ['live', 'demo', 'in_development'] as const;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const projectPageSchema = z.object({
    icon: z.string().max(16).optional(),
    eyebrow: z.string().optional(),
    headline: z.string().default(''),
    lede: z.string().default(''),
    meta: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    cardTitle: z.string().default(''),
    cardBody: z.string().default(''),
    cardPreview: z.enum(['dashboard', 'approval', 'image']).optional(),
    cardImage: z.string().optional(),
    storyTitle: z.string().optional(),
    storyIntro: z.string().optional(),
    closing: z.object({ eyebrow: z.string(), title: z.string(), body: z.string() }).optional(),
});

export const pricePlanSchema = z.object({
    id,
    region: z.enum(['UK', 'IN', 'US', 'EU', 'GLOBAL', 'CUSTOM']),
    label: z.string().trim().min(1),
    currency: z.enum(['GBP', 'INR', 'USD', 'EUR']).nullable(),
    setup: z.number().nonnegative().nullable(),
    monthly: z.number().nonnegative().nullable(),
    isQuote: z.boolean(),
    badge: z.string().optional(),
    terms: z.array(z.string()).default([]),
    note: z.string().optional(),
    order: z.number().int(),
    visible: z.boolean(),
}).refine((p) => p.isQuote || p.currency !== null, { message: 'A priced plan needs a currency', path: ['currency'] });

export const demoVideoSchema = z.object({
    id,
    title: z.string().trim().min(1),
    caption: z.string().optional(),
    source: z.enum(['upload', 'url', 'none']),
    url: assetUrl.optional(),
    mediaId: z.string().optional(),
    posterUrl: assetUrl.optional(),
    durationSec: z.number().int().nonnegative().optional(),
    featured: z.boolean(),
    order: z.number().int(),
    visible: z.boolean(),
}).refine((d) => d.source === 'none' || !!d.url, { message: 'A video needs a URL (upload it or paste one)', path: ['url'] });

export const liveLinkSchema = z.object({ url: httpsUrl, label: z.string().trim().min(1), note: z.string().optional() });

export const screenshotSchema = z.object({
    id, url: assetUrl, alt: z.string().trim().min(1), caption: z.string().optional(), order: z.number().int(),
});

// Story visuals are a tagged union; validated loosely per type (the admin edits them as JSON).
export const storyStepSchema = z.object({
    id,
    kicker: z.string(),
    title: z.string(),
    body: z.string(),
    status: z.array(z.string()).default([]),
    visual: z.object({ type: z.enum(['image', 'chat', 'terminal', 'facts', 'gate']) }).passthrough(),
    order: z.number().int(),
});

export const featureSchema = z.object({ title: z.string().trim().min(1), body: z.string().optional() });
export const faqSchema = z.object({ q: z.string().trim().min(1), a: z.string().trim().min(1) });
export const ctaSchema = z.object({
    primaryLabel: z.string(), primaryHref: z.string(),
    secondaryLabel: z.string().optional(), secondaryHref: z.string().optional(),
}).partial();
export const seoSchema = z.object({ title: z.string(), description: z.string(), ogImage: z.string() }).partial();

/** The v2 project fields, all optional so the old admin form (which never sends them) keeps working. */
export const projectV2Fields = {
    slug: z.string().trim().regex(SLUG_RE, 'Slug: lowercase letters, numbers and dashes').max(120).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    showInNav: z.boolean().optional(),
    dataLabel: z.string().max(80).optional(),
    page: projectPageSchema.optional(),
    pricePlans: z.array(pricePlanSchema).optional(),
    demos: z.array(demoVideoSchema)
        .refine((ds) => ds.filter((d) => d.featured).length <= 1, 'Only one demo video can be featured')
        .optional(),
    liveLink: liveLinkSchema.nullable().optional(),
    screenshots: z.array(screenshotSchema).optional(),
    story: z.array(storyStepSchema).optional(),
    features: z.array(featureSchema).optional(),
    faq: z.array(faqSchema).optional(),
    cta: ctaSchema.optional(),
    seo: seoSchema.optional(),
};

export type ProjectPage = z.infer<typeof projectPageSchema>;
export type PricePlan = z.infer<typeof pricePlanSchema>;
export type DemoVideo = z.infer<typeof demoVideoSchema>;
export type LiveLink = z.infer<typeof liveLinkSchema>;
export type Screenshot = z.infer<typeof screenshotSchema>;
export type StoryStep = z.infer<typeof storyStepSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type FaqItem = z.infer<typeof faqSchema>;
export type Cta = z.infer<typeof ctaSchema>;
export type Seo = z.infer<typeof seoSchema>;

// ============================================================================
// SiteSettings (rows in site_configuration). Only these keys are validated;
// every other key is saved as before so the old Site Settings tabs keep working.
// ============================================================================

export const SOCIAL_ICONS = ['linkedin', 'x', 'instagram', 'youtube', 'github', 'upwork', 'contra', 'fiverr',
    'facebook', 'threads', 'whatsapp', 'email', 'globe', 'link'] as const;

export const socialLinkSchema = z.object({
    id,
    platform: z.string().trim().min(1).max(50),
    label: z.string().trim().min(1).max(100),
    // mailto: allowed so an "Email" row works; everything else must be https.
    url: z.string().trim().refine((u) => /^https:\/\/\S+$/.test(u) || /^mailto:\S+@\S+$/.test(u), 'URL must start with https:// (or mailto:)'),
    icon: z.enum(SOCIAL_ICONS),
    order: z.number().int(),
    visible: z.boolean(),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

// site_configuration.value is NOT NULL, so "not set" is stored as ''.
const optionalHttps = z.union([httpsUrl, z.literal(''), z.null()]).transform((v) => v ?? '');

export const settingsKeySchemas: Record<string, z.ZodTypeAny> = {
    contact_email: z.string().trim().email(),
    booking_url: optionalHttps,
    booking_label: z.string(),
    company_name: z.string(),
    company_legal_line: z.string(),
    address_line: z.string(),
    timezone_line: z.string(),
    serves_line: z.string(),
    phone: z.string().nullable().transform((v) => v ?? ''),
    whatsapp_url: optionalHttps,
    pilot_banner: z.object({ visible: z.boolean(), badge: z.string(), text: z.string(), href: z.string() }),
    footer_honesty: z.array(z.string()),
    social_links: z.array(socialLinkSchema),
};

// ============================================================================
// Pages → sections (table `pages`). A section is one of the site's existing visual blocks; its `data`
// holds that block's text and lists. Data is free-form per type, but every link in it is checked.
// ============================================================================

export const SECTION_TYPES = ['hero', 'page-hero', 'logos', 'cards', 'products', 'demo-screen', 'steps', 'founder',
    'about', 'faq', 'cta', 'text', 'contact', 'media'] as const;

/** Site paths, #anchors, {booking}-style tokens, https and mailto/tel links. Never javascript: or data:. */
export const SAFE_HREF = /^(\/(?!\/)\S*|#\S*|\{[a-z_-]+\}\S*|https:\/\/\S+|mailto:\S+|tel:\S+)?$/;
const safeHref = z.string().trim().refine((h) => SAFE_HREF.test(h), 'Link must start with /, #, https://, mailto: or tel:');

/** Every string under a key named href/…Href anywhere in a section's data must be a safe link. */
export function unsafeHrefs(value: unknown, path = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((v, i) => unsafeHrefs(v, `${path}[${i}]`));
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([k, v]) =>
        /href$/i.test(k) && typeof v === 'string' && !SAFE_HREF.test(v.trim())
            ? [`${path ? path + '.' : ''}${k}`]
            : unsafeHrefs(v, `${path ? path + '.' : ''}${k}`));
}

export const sectionSchema = z.object({
    id,
    type: z.enum(SECTION_TYPES),
    visible: z.boolean().default(true),
    anchor: z.string().trim().regex(/^[a-z0-9-]*$/, 'Anchor: lowercase letters, numbers and dashes').max(60).optional(),
    data: z.record(z.string(), z.unknown()).default({}),
}).superRefine((s, ctx) => {
    for (const p of unsafeHrefs(s.data)) {
        ctx.addIssue({ code: 'custom', path: ['data', p], message: 'Link must start with /, #, https://, mailto: or tel:' });
    }
});
export type Section = z.infer<typeof sectionSchema>;

// Addresses the site already uses for something else; a page cannot take them.
export const RESERVED_SLUGS = ['demos', 'research', 'api', 'admin', 'media', 'assets', 'brand', 'uploads', '404'];

export const pageSchema = z.object({
    slug: z.string().trim().regex(SLUG_RE, 'Address: lowercase letters, numbers and dashes').max(120)
        .refine((s) => !RESERVED_SLUGS.includes(s), 'That address is used by the site already'),
    title: z.string().trim().min(1, 'Page name is required').max(255),
    sections: z.array(sectionSchema).max(60, 'A page can hold 60 sections')
        .refine((ss) => new Set(ss.map((s) => s.id)).size === ss.length, 'Two sections share one id'),
    seo: seoSchema.default({}),
    isPublished: z.boolean().default(true),
    displayOrder: z.number().int().optional(),
});
export type PageInput = z.infer<typeof pageSchema>;

const navItemSchema = z.object({ id, label: z.string().trim().min(1).max(60), href: safeHref, visible: z.boolean() });
const footerColumnSchema = z.object({
    id,
    title: z.string().trim().max(60),
    kind: z.enum(['links', 'products', 'lines', 'social']),
    links: z.array(z.object({ label: z.string().trim().min(1).max(80), href: safeHref })).default([]),
    lines: z.array(z.string()).default([]),
    limit: z.number().int().min(1).max(20).optional(),
    allLabel: z.string().optional(),
});

// Menu and footer are site settings too (keys in site_configuration).
Object.assign(settingsKeySchemas, {
    site_nav: z.object({ items: z.array(navItemSchema).max(12), menuNote: z.string().default('') }),
    site_footer: z.object({ blurb: z.string(), columns: z.array(footerColumnSchema).max(8), copyright: z.string() }),
});

/** Public view: hidden list rows never leave the server. */
export function visibleOnly<T extends { visible?: boolean }>(rows: T[] | null | undefined): T[] {
    return (rows ?? []).filter((r) => r.visible !== false);
}

export function slugify(text: string): string {
    return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'project';
}
