// Re-tests every admin/public feature that existed before v2 (ADMIN-FEATURES.md) plus the v2 content
// model, against a throwaway in-memory Postgres. Run: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startThrowaway, createAdmin } from './helpers/throwaway.mjs';

let t, superToken, limitedToken, limitedUser;
let ipCounter = 0;

// Every request gets its own client IP (trust proxy = 1), so the per-IP rate limiters never trip in tests.
async function call(method, url, { token, body } = {}) {
    const headers = { 'x-forwarded-for': `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(t.baseUrl + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
}
const get = (u, o) => call('GET', u, o);
const post = (u, body, o = {}) => call('POST', u, { ...o, body });
const put = (u, body, o = {}) => call('PUT', u, { ...o, body });
const patch = (u, body, o = {}) => call('PATCH', u, { ...o, body });
const del = (u, o) => call('DELETE', u, o);
const as = (token) => ({ token });

async function login(email, password) {
    const r = await post('/api/admin/auth/login', { email, password });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.token;
}

before(async () => {
    t = await startThrowaway();
    await createAdmin(t.db, { email: 'owner@local.test', password: 'Owner-pass!123' });
    limitedUser = await createAdmin(t.db, {
        email: 'editor@local.test', password: 'Editor-pass!123', role: 'admin',
        permissions: { dashboard: true, projects: true, services: false, capabilities: false, clientFit: false,
            process: false, about: false, techStack: false, trustSignals: false, media: false, inbox: false,
            siteConfig: false, formOptions: false, users: false },
    });
    superToken = await login('owner@local.test', 'Owner-pass!123');
    limitedToken = await login('editor@local.test', 'Editor-pass!123');
});
after(async () => { await t?.stop(); });

// ---------------------------------------------------------------------------
// Old features (must behave exactly as before)
// ---------------------------------------------------------------------------

test('health and api info', async () => {
    assert.equal((await get('/health')).body.status, 'ok');
    assert.equal((await get('/api')).body.name, 'BalaAstraTech Portfolio API');
});

test('auth: wrong password 401, verify, change password, logout, check-status, unknown reset token', async () => {
    assert.equal((await post('/api/admin/auth/login', { email: 'owner@local.test', password: 'nope' })).status, 401);
    const v = await get('/api/admin/auth/verify', as(superToken));
    assert.equal(v.status, 200); assert.equal(v.body.user.email, 'owner@local.test');
    assert.equal((await get('/api/admin/auth/verify')).status, 401);
    const cp = await post('/api/admin/auth/change-password', { currentPassword: 'Editor-pass!123', newPassword: 'Editor-pass!456' }, as(limitedToken));
    assert.equal(cp.status, 200, JSON.stringify(cp.body));
    limitedToken = await login('editor@local.test', 'Editor-pass!456');
    assert.equal((await post('/api/admin/auth/logout', {}, as(limitedToken))).status, 200);
    const cs = await post('/api/admin/auth/check-status', { email: 'owner@local.test' });
    assert.equal(cs.status, 200); assert.equal(cs.body.status, 'active');
    assert.equal((await post('/api/admin/auth/reset-password', { token: 'not-a-token', password: 'whatever-123' })).status, 400);
    assert.equal((await post('/api/admin/auth/verify-email', { email: 'owner@local.test', code: '000000' })).status, 400);
});

test('auth: register creates a pending, unverified user that cannot log in', async () => {
    const r = await post('/api/admin/auth/register', { email: 'new@local.test', password: 'New-pass!123', name: 'New' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal((await post('/api/admin/auth/register', { email: 'new@local.test', password: 'New-pass!123', name: 'New' })).status, 409);
    assert.equal((await post('/api/admin/auth/login', { email: 'new@local.test', password: 'New-pass!123' })).status, 403);
    // forgot-password answers the same whether or not mail could go out (outbound calls are blocked)
    assert.ok([200, 500].includes((await post('/api/admin/auth/forgot-password', { email: 'new@local.test' })).status));
});

test('session check (GET /verify) does not use up the 5-per-15-minute login limit', async () => {
    const headers = { authorization: `Bearer ${superToken}`, 'x-forwarded-for': '10.99.0.1' };
    for (let i = 0; i < 8; i++) {
        const r = await fetch(t.baseUrl + '/api/admin/auth/verify', { headers });
        assert.equal(r.status, 200, `page load ${i + 1}`);
    }
    // wrong passwords from one IP are still capped
    const bad = { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.99.0.2' }, body: JSON.stringify({ email: 'x@local.test', password: 'nope' }) };
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await fetch(t.baseUrl + '/api/admin/auth/login', bad)).status);
    assert.equal(codes[5], 429, codes.join(','));
});

test('admin routes need a token; permissions are enforced', async () => {
    assert.equal((await get('/api/admin/projects')).status, 401);
    assert.equal((await get('/api/admin/projects', as(limitedToken))).status, 200);
    assert.equal((await get('/api/admin/services', as(limitedToken))).status, 403);
    assert.equal((await get('/api/admin/config', as(limitedToken))).status, 403);
    assert.equal((await get('/api/admin/users', as(limitedToken))).status, 403);
});

// Generic CRUD + reorder + public listing check for every list-type section of the old admin.
const sections = [
    { name: 'services', admin: '/api/admin/services', make: (n) => ({ title: `S${n}`, iconName: 'Bot', inputDescription: 'in', outputDescription: 'out', isPublished: true }), pub: async () => (await get('/api/public/services')).body.services },
    { name: 'capabilities', admin: '/api/admin/capabilities', make: (n) => ({ label: `C${n}`, iconName: 'Zap' }), pub: async () => (await get('/api/public/services')).body.additionalCapabilities },
    { name: 'tech-stack', admin: '/api/admin/tech-stack', make: (n) => ({ layerName: `L${n}`, technologies: ['React'] }), pub: async () => (await get('/api/public/tech-stack')).body },
    { name: 'trust-signals', admin: '/api/admin/trust-signals', make: (n) => ({ title: `T${n}`, description: 'd', iconName: 'Shield', isPublished: true }), pub: async () => (await get('/api/public/trust-signals')).body },
    { name: 'client-fit', admin: '/api/admin/client-fit', make: (n) => ({ type: 'compatible', text: `F${n}`, isPublished: true }), pub: async () => (await get('/api/public/client-fit')).body },
    { name: 'process', admin: '/api/admin/process', make: (n) => ({ title: `P${n}`, description: 'd', iconName: 'Cog', duration: '1 week', isPublished: true }), pub: async () => (await get('/api/public/process')).body },
    { name: 'about', admin: '/api/admin/about', make: (n) => ({ title: `A${n}`, description: 'd', isPublished: true }), pub: async () => (await get('/api/public/about')).body },
];

for (const s of sections) {
    test(`${s.name}: create, read, update, reorder, public list, delete`, async () => {
        const tok = as(superToken);
        const a = await post(s.admin, s.make(1), tok);
        const b = await post(s.admin, s.make(2), tok);
        assert.equal(a.status, 201, JSON.stringify(a.body)); assert.equal(b.status, 201);
        assert.equal((await get(`${s.admin}/${a.body.id}`, tok)).status, 200);
        assert.equal((await put(`${s.admin}/${a.body.id}`, s.make(9), tok)).status, 200);
        assert.equal((await patch(`${s.admin}/reorder`, { items: [{ id: b.body.id, order: 1 }, { id: a.body.id, order: 2 }] }, tok)).status, 200);
        const list = (await get(s.admin, tok)).body;
        assert.deepEqual(list.map((x) => x.id), [b.body.id, a.body.id]);
        assert.equal((await s.pub()).length, 2);
        assert.equal((await del(`${s.admin}/${a.body.id}`, tok)).status, 200);
        assert.equal((await del(`${s.admin}/${b.body.id}`, tok)).status, 200);
        assert.equal((await get(`${s.admin}/${a.body.id}`, tok)).status, 404);
    });
}

test('case studies: publish needs consent; public shows only consented + published', async () => {
    const tok = as(superToken);
    const base = { clientLabel: 'Clinic', problem: 'p', build: 'b', result: 'r', pillarTags: [] };
    assert.equal((await post('/api/admin/case-studies', { ...base, isPublished: true }, tok)).status, 400);
    const c = await post('/api/admin/case-studies', { ...base, isPublished: true, consentConfirmed: true }, tok);
    assert.equal(c.status, 201);
    assert.equal((await put(`/api/admin/case-studies/${c.body.id}`, { ...base, isPublished: true, consentConfirmed: true, result: 'r2' }, tok)).status, 200);
    assert.equal((await get('/api/public/case-studies')).body.length, 1);
    assert.equal((await del(`/api/admin/case-studies/${c.body.id}`, tok)).status, 200);
});

test('projects (old form fields): create, edit, reorder, delete still work', async () => {
    const tok = as(superToken);
    const oldForm = { title: 'Old Style', category: 'Web', shortDescription: 's', fullDescription: 'f', previewUrl: 'https://example.com', specifications: ['a'], techStack: ['React'], isPublished: true };
    const p = await post('/api/admin/projects', oldForm, tok);
    assert.equal(p.status, 201, JSON.stringify(p.body));
    assert.equal(p.body.slug, 'old-style'); // generated
    const e = await put(`/api/admin/projects/${p.body.id}`, { ...oldForm, title: 'Old Style 2' }, tok);
    assert.equal(e.status, 200); assert.equal(e.body.title, 'Old Style 2'); assert.equal(e.body.slug, 'old-style');
    assert.equal((await patch('/api/admin/projects/reorder', { items: [{ id: p.body.id, order: 7 }] }, tok)).body.message, 'Projects reordered successfully');
    assert.equal((await get(`/api/admin/projects/${p.body.id}`, tok)).body.displayOrder, 7);
    // the form sends an empty preview URL as '' — must save (was a 400)
    const empty = await put(`/api/admin/projects/${p.body.id}`, { ...oldForm, previewUrl: '' }, tok);
    assert.equal(empty.status, 200, JSON.stringify(empty.body)); assert.equal(empty.body.previewUrl, null);
    assert.equal((await del(`/api/admin/projects/${p.body.id}`, tok)).status, 200);
});

test('site config + form options + dashboard stats', async () => {
    const tok = as(superToken);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'hero_title', value: 'Hello' }, { key: 'social_github', value: 'https://github.com/x' }] }, tok)).status, 200);
    const cfg = (await get('/api/public/config')).body;
    assert.equal(cfg.hero_title, 'Hello'); assert.equal(cfg.social_github, 'https://github.com/x');
    assert.ok((await get('/api/admin/config', tok)).body.some((r) => r.key === 'hero_title'));
    const o = await post('/api/admin/form-options', { optionType: 'system_type', optionValue: 'Chatbot' }, tok);
    assert.equal(o.status, 201);
    assert.deepEqual((await get('/api/public/form-options')).body.systemTypes, ['Chatbot']);
    assert.equal((await get('/api/admin/form-options', tok)).body.length, 1);
    assert.equal((await del(`/api/admin/form-options/${o.body.id}`, tok)).status, 200);
    const stats = await get('/api/admin/stats', tok);
    assert.equal(stats.status, 200); assert.ok('unreadMessages' in stats.body);
    for (const k of ['productsLive', 'productsHidden', 'pages']) assert.equal(typeof stats.body[k], 'number', k);
});

test('contact form -> inbox: old form (with budget) and v2 form (no budget); status + delete', async () => {
    const tok = as(superToken);
    const old = await post('/api/public/contact', { name: 'Ann', email: 'ann@example.com', projectType: 'Chatbot', budget: '$1-2k', message: 'Hello there, long enough.' });
    assert.ok([201, 202].includes(old.status), JSON.stringify(old.body));
    const v2 = await post('/api/public/contact', { name: 'Ben', email: 'ben@example.com', projectType: 'Lead Response Desk', message: 'Hello there, long enough.' });
    assert.ok([201, 202].includes(v2.status), JSON.stringify(v2.body));
    assert.equal((await post('/api/public/contact', { name: 'B', email: 'bad', projectType: '', message: 'x' })).status, 400);
    const inbox = (await get('/api/admin/inbox', tok)).body;
    const rows = Array.isArray(inbox) ? inbox : inbox.data;
    const ben = rows.find((r) => r.email === 'ben@example.com');
    assert.equal(ben.budget, 'not asked');
    assert.equal(ben.emailStatus, v2.status === 201 ? 'sent' : 'failed'); // outbound mail is blocked in tests -> failed
    assert.equal((await patch(`/api/admin/inbox/${ben.id}`, { status: 'read' }, tok)).status, 200);
    const replied = await patch(`/api/admin/inbox/${ben.id}`, { status: 'replied' }, tok);
    assert.equal(replied.status, 200); assert.equal(replied.body.isRead, true);
    assert.equal((await del(`/api/admin/inbox/${ben.id}`, tok)).status, 200);
});

test('users (super admin): list, get, update permissions, suspend, activate, delete', async () => {
    const tok = as(superToken);
    const list = (await get('/api/admin/users', tok)).body;
    assert.ok((Array.isArray(list) ? list : list.users).length >= 2);
    assert.equal((await get(`/api/admin/users/${limitedUser.id}`, tok)).status, 200);
    const perms = { dashboard: true, projects: true, services: true, capabilities: false, clientFit: false, process: false, about: false, techStack: false, trustSignals: false, media: false, inbox: false, siteConfig: false, formOptions: false, users: false };
    assert.equal((await put(`/api/admin/users/${limitedUser.id}`, { permissions: perms }, tok)).status, 200);
    assert.equal((await patch(`/api/admin/users/${limitedUser.id}/suspend`, {}, tok)).status, 200);
    assert.notEqual((await post('/api/admin/auth/login', { email: 'editor@local.test', password: 'Editor-pass!456' })).status, 200);
    assert.equal((await patch(`/api/admin/users/${limitedUser.id}/activate`, {}, tok)).status, 200);
    const tmp = await createAdmin(t.db, { email: 'tmp@local.test', password: 'Tmp-pass!123', role: 'admin' });
    assert.equal((await del(`/api/admin/users/${tmp.id}`, tok)).status, 200);
});

test('media: upload signature now needs login (was open to anyone)', async () => {
    assert.equal((await get('/api/admin/media/sign-upload')).status, 401);
    assert.equal((await del('/api/admin/media/some-id')).status, 401);
    const s = await get('/api/admin/media/sign-upload', as(superToken));
    assert.equal(s.status, 200); assert.equal(s.body.folder, 'balaastra-portfolio'); assert.ok(s.body.signature);
});

// ---------------------------------------------------------------------------
// v2 content model
// ---------------------------------------------------------------------------

const plan = (o = {}) => ({ id: 'uk', region: 'UK', label: 'United Kingdom', currency: 'GBP', setup: 195, monthly: 79, isQuote: false, terms: ['60-day pilot'], order: 1, visible: true, ...o });
const demo = (o = {}) => ({ id: 'd1', title: 'Walkthrough', source: 'url', url: 'https://www.youtube.com/watch?v=abc', featured: true, order: 1, visible: true, ...o });

test('v2 seed: one seed file feeds site and admin; Organizer seeded as the 7th; same product list both sides', async () => {
    const { seedV2, loadSeed, SEED_FILE } = await import('../dist/seeds/seed-v2.js');
    assert.ok(SEED_FILE.split(path.sep).join('/').endsWith('frontend/src/content/seed.json'), SEED_FILE);
    const seed = loadSeed();
    const first = await seedV2(t.db, seed);
    assert.equal(first.projects, 7); assert.equal(first.pages, 6); assert.equal(first.settings, seed.settings.length);
    assert.deepEqual(await seedV2(t.db, seed), first); // idempotent upsert
    assert.equal((await seedV2(t.db, seed, { overwrite: false })).kept, 7 + 6 + seed.settings.length); // a keep-run touches nothing
    const pub = (await get('/api/public/projects')).body.map((p) => p.slug);
    assert.deepEqual(pub, ['lead-response-desk', 'inventra', 'negotiation-copilot', 'content-engine', 'breakeven', 'total-recall', 'organizer']);
    const admin = (await get('/api/admin/projects', as(superToken))).body.map((p) => p.slug);
    assert.deepEqual(admin, pub); // admin lists exactly what the site lists
    assert.deepEqual(seed.projectRows.map((p) => p.slug), pub); // and the site's offline fallback is the same file
    const lrd = (await get('/api/public/projects/lead-response-desk')).body;
    assert.equal(lrd.pricePlans.length, 0); // his decision: no price plans
    assert.equal(lrd.demos.find((d) => d.featured).url, '/media/lead-response-desk/demo-16x9.mp4');
    const inv = (await get('/api/public/projects/inventra')).body;
    assert.deepEqual(inv.pricePlans.map((p) => p.isQuote), [true]);
    assert.equal((await get('/api/public/projects/nope')).status, 404);
    const cfg = (await get('/api/public/config')).body;
    assert.equal(cfg.contact_email, 'yuvraj@balaastratech.com');
    assert.equal(cfg.booking_url, 'https://calendly.com/yuvraj-balaastratech');
    assert.deepEqual(cfg.site_nav.items.map((i) => i.label), ['Home', 'Products', 'About', 'Contact']);
    assert.equal(cfg.site_footer.columns.length, 4);
    const pages = (await get('/api/public/pages')).body;
    assert.deepEqual(pages.map((p) => p.slug), ['home', 'products', 'about', 'contact', 'privacy', 'pricing']);
    assert.equal(pages[0].sections[0].type, 'hero');
});

test('media size check + seed-production planning (no upload, no network)', async () => {
    const { collectMedia, rewriteSeed, mediaProblems, LIMIT_MB } = await import('../dist/scripts/seed-production.js');
    const { loadSeed } = await import('../dist/seeds/seed-v2.js');
    const seed = loadSeed();
    const files = collectMedia(seed, '/no/such/dir');
    assert.ok(files.length >= 12);
    assert.ok(files.every((f) => f.publicId.startsWith('balaastra-portfolio/seed/')));
    assert.match(mediaProblems(files)[0], /Missing file/);
    const big = [{ url: '/media/x/big.mp4', file: '/m/x/big.mp4', publicId: 'p', video: true, mb: 223 }];
    assert.ok(mediaProblems(big)[0].includes(`big.mp4 is 223 MB; the Cloudinary limit is ${LIMIT_MB} MB. Run: node scripts/compress-video.mjs`));
    assert.deepEqual(mediaProblems([{ ...big[0], mb: 99 }]), []);
    const urls = new Map(files.map((f) => [f.url, { url: `https://res.cloudinary.com/demo/${f.publicId}`, publicId: f.publicId }]));
    const out = rewriteSeed(seed, urls);
    assert.ok(!JSON.stringify(out).includes('"/media/'));
    const demo = out.projectRows.find((p) => p.slug === 'breakeven').demos[0];
    assert.equal(demo.source, 'upload'); assert.equal(demo.mediaId, 'balaastra-portfolio/seed/breakeven/demo-16x9');
});

test('pages + sections API: add, edit, hide, reorder, delete; public shows only visible sections', async () => {
    const tok = as(superToken);
    const s = (id, type, data = {}, visible = true) => ({ id, type, visible, data });
    const body = { slug: 'case-study', title: 'Case study', seo: { title: 'Case study' }, isPublished: true,
        sections: [s('a', 'page-hero', { title: 'Hello' }), s('b', 'text', { items: [{ heading: 'H', body: 'B' }] })] };
    const c = await post('/api/admin/pages', body, tok);
    assert.equal(c.status, 201, JSON.stringify(c.body));
    assert.equal(c.body.isSystem, false);
    // add a section, hide one, reorder (the page is saved whole)
    const edited = { ...body, sections: [s('c', 'cta', { title: 'Go', secondaryHref: '/contact' }), body.sections[0], { ...body.sections[1], visible: false }] };
    const u = await put(`/api/admin/pages/${c.body.id}`, edited, tok);
    assert.equal(u.status, 200, JSON.stringify(u.body));
    assert.deepEqual(u.body.sections.map((x) => x.id), ['c', 'a', 'b']);
    const pub = (await get('/api/public/pages')).body.find((p) => p.slug === 'case-study');
    assert.deepEqual(pub.sections.map((x) => x.id), ['c', 'a']); // hidden section stays private
    // delete a section
    assert.deepEqual((await put(`/api/admin/pages/${c.body.id}`, { ...edited, sections: edited.sections.slice(1) }, tok)).body.sections.map((x) => x.id), ['a', 'b']);
    // validation: unsafe link, unknown type, reserved / duplicate address, duplicate section id
    assert.equal((await put(`/api/admin/pages/${c.body.id}`, { ...body, sections: [s('x', 'cta', { secondaryHref: 'javascript:alert(1)' })] }, tok)).status, 400);
    assert.equal((await put(`/api/admin/pages/${c.body.id}`, { ...body, sections: [s('x', 'carousel')] }, tok)).status, 400);
    assert.equal((await post('/api/admin/pages', { ...body, slug: 'demos' }, tok)).status, 400);
    assert.equal((await post('/api/admin/pages', body, tok)).status, 409);
    assert.equal((await put(`/api/admin/pages/${c.body.id}`, { ...body, sections: [s('x', 'text'), s('x', 'cta')] }, tok)).status, 400);
    // unpublished pages are not public
    await put(`/api/admin/pages/${c.body.id}`, { ...body, isPublished: false }, tok);
    assert.ok(!(await get('/api/public/pages')).body.some((p) => p.slug === 'case-study'));
    // main pages: cannot be deleted or moved; can be edited
    const home = (await get('/api/admin/pages', tok)).body.find((p) => p.slug === 'home');
    assert.equal((await del(`/api/admin/pages/${home.id}`, tok)).status, 400);
    assert.equal((await put(`/api/admin/pages/${home.id}`, { slug: 'start', title: 'Home', sections: home.sections, seo: home.seo }, tok)).status, 400);
    const heroEdit = home.sections.map((x) => (x.type === 'hero' ? { ...x, data: { ...x.data, h1: 'Changed in admin' } } : x));
    assert.equal((await put(`/api/admin/pages/${home.id}`, { slug: 'home', title: 'Home', sections: heroEdit, seo: home.seo }, tok)).status, 200);
    assert.equal((await get('/api/public/pages')).body.find((p) => p.slug === 'home').sections[0].data.h1, 'Changed in admin');
    // permission: editor without siteConfig cannot touch pages
    assert.equal((await get('/api/admin/pages', as(limitedToken))).status, 403);
    assert.equal((await del(`/api/admin/pages/${c.body.id}`, tok)).status, 200);
    assert.equal((await get(`/api/admin/pages/${c.body.id}`, tok)).status, 404);
});

test('menu + footer settings: links validated', async () => {
    const tok = as(superToken);
    const nav = { items: [{ id: 'n1', label: 'Home', href: '/', visible: true }, { id: 'n2', label: 'Case study', href: '/case-study', visible: true }], menuNote: '{email}' };
    assert.equal((await put('/api/admin/config', { items: [{ key: 'site_nav', value: nav }] }, tok)).status, 200);
    assert.deepEqual((await get('/api/public/config')).body.site_nav.items.map((i) => i.href), ['/', '/case-study']);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'site_nav', value: { ...nav, items: [{ ...nav.items[0], href: 'javascript:x' }] } }] }, tok)).status, 400);
    const footer = { blurb: 'b', copyright: '© {legal}', columns: [{ id: 'c', title: 'Links', kind: 'links', links: [{ label: 'Book', href: '{booking}' }], lines: [] }] };
    assert.equal((await put('/api/admin/config', { items: [{ key: 'site_footer', value: footer }] }, tok)).status, 200);
});

test('v2 projects: full create with plans, demos, live link; slug rules; publish toggle', async () => {
    const tok = as(superToken);
    const body = {
        title: 'Clinic Bot', category: 'Chatbot', shortDescription: 'Answers patients', fullDescription: 'Long text',
        specifications: [], techStack: [], isPublished: false,
        slug: 'clinic-bot', status: 'in_development', showInNav: false, dataLabel: 'Demo · sample data',
        page: { headline: 'Patients *answered*', lede: 'l', meta: [], cardTitle: 'c', cardBody: 'b' },
        pricePlans: [plan(), plan({ id: 'in', region: 'IN', label: 'India', currency: 'INR', setup: 7500, monthly: 2999, order: 2 }), plan({ id: 'q', region: 'CUSTOM', label: 'Custom', currency: null, setup: null, monthly: null, isQuote: true, order: 3, visible: false })],
        demos: [demo(), demo({ id: 'd2', title: 'Upload', source: 'upload', url: 'https://res.cloudinary.com/x/video/upload/v1/a.mp4', mediaId: 'balaastra-portfolio/a', featured: false, order: 2 }), demo({ id: 'd3', title: 'Coming', source: 'none', url: undefined, featured: false, order: 3 })],
        liveLink: { url: 'https://app.example.com', label: 'Open the live app' },
        features: [{ title: 'Books calls' }], faq: [{ q: 'Q?', a: 'A.' }],
        cta: { primaryLabel: 'Book', primaryHref: '{booking}' }, seo: { title: 'Clinic Bot' },
        screenshots: [{ id: 's1', url: '/demos/clinic/1.png', alt: 'Inbox', order: 1 }],
    };
    const c = await post('/api/admin/projects', body, tok);
    assert.equal(c.status, 201, JSON.stringify(c.body));
    assert.equal(c.body.pricePlans.length, 3); assert.equal(c.body.liveLink.url, 'https://app.example.com');

    // Unpublished -> not public; publish toggle -> public, hidden plan filtered out
    assert.equal((await get('/api/public/projects/clinic-bot')).status, 404);
    assert.equal((await patch(`/api/admin/projects/${c.body.id}/publish`, { isPublished: true }, tok)).body.isPublished, true);
    const pub = (await get('/api/public/projects/clinic-bot')).body;
    assert.equal(pub.pricePlans.length, 2); assert.equal(pub.demos.length, 3);

    // Slug clash 409, bad slug 400
    assert.equal((await post('/api/admin/projects', { ...body, title: 'Other' }, tok)).status, 409);
    assert.equal((await put(`/api/admin/projects/${c.body.id}`, { ...body, slug: 'Bad Slug' }, tok)).status, 400);
    // Auto slug avoids clash
    const auto = await post('/api/admin/projects', { title: 'Clinic Bot', category: 'x', shortDescription: 's', fullDescription: 'f', specifications: [], techStack: [] }, tok);
    assert.equal(auto.body.slug, 'clinic-bot-2');

    // Validation: http (not https) live link, two featured demos, priced plan without currency, video without url
    assert.equal((await put(`/api/admin/projects/${c.body.id}`, { ...body, liveLink: { url: 'http://x.com', label: 'x' } }, tok)).status, 400);
    assert.equal((await put(`/api/admin/projects/${c.body.id}`, { ...body, demos: [demo(), demo({ id: 'd9' })] }, tok)).status, 400);
    assert.equal((await put(`/api/admin/projects/${c.body.id}`, { ...body, pricePlans: [plan({ currency: null })] }, tok)).status, 400);
    assert.equal((await put(`/api/admin/projects/${c.body.id}`, { ...body, demos: [demo({ url: undefined })] }, tok)).status, 400);

    // Old-style save (no v2 fields) must NOT wipe v2 content
    const oldSave = await put(`/api/admin/projects/${c.body.id}`, { title: 'Clinic Bot', category: 'Chatbot', shortDescription: 's2', fullDescription: 'f', previewUrl: null, specifications: [], techStack: [], isPublished: true }, tok);
    assert.equal(oldSave.status, 200);
    assert.equal(oldSave.body.pricePlans.length, 3); assert.equal(oldSave.body.slug, 'clinic-bot');

    // Remove live link, reorder demos
    const edited = await put(`/api/admin/projects/${c.body.id}`, { ...body, isPublished: true, liveLink: null, demos: [body.demos[1], body.demos[0]].map((d, i) => ({ ...d, order: i + 1 })) }, tok);
    assert.equal(edited.body.liveLink, null); assert.equal(edited.body.demos[0].id, 'd2');

    // Limited editor (projects permission only) can manage projects too
    assert.equal((await patch(`/api/admin/projects/${c.body.id}/publish`, { isPublished: false }, as(limitedToken))).status, 200);
    assert.equal((await del(`/api/admin/projects/${c.body.id}`, tok)).status, 200);
    assert.equal((await del(`/api/admin/projects/${auto.body.id}`, tok)).status, 200);
    assert.equal((await patch(`/api/admin/projects/${c.body.id}/publish`, { isPublished: true }, tok)).status, 404);
});

test('v2 SiteSettings: social links list validated; any new platform can be added', async () => {
    const tok = as(superToken);
    const links = [
        { id: 'a', platform: 'Threads', label: 'Us on Threads', url: 'https://www.threads.net/@x', icon: 'threads', order: 2, visible: true },
        { id: 'b', platform: 'My new site', label: 'Blog', url: 'https://blog.example.com', icon: 'link', order: 1, visible: true },
        { id: 'c', platform: 'Email', label: 'Email us', url: 'mailto:yuvraj@balaastratech.com', icon: 'email', order: 3, visible: false },
    ];
    assert.equal((await put('/api/admin/config', { items: [{ key: 'social_links', value: links }] }, tok)).status, 200);
    assert.deepEqual((await get('/api/public/config')).body.social_links.map((s) => s.platform), ['My new site', 'Threads']);
    const bad = await put('/api/admin/config', { items: [{ key: 'social_links', value: [{ ...links[0], url: 'javascript:alert(1)' }] }] }, tok);
    assert.equal(bad.status, 400);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'social_links', value: [{ ...links[0], icon: 'myspace' }] }] }, tok)).status, 400);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'contact_email', value: 'not-an-email' }] }, tok)).status, 400);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'booking_url', value: 'http://calendly.com/x' }] }, tok)).status, 400);
    assert.equal((await put('/api/admin/config', { items: [{ key: 'pilot_banner', value: { visible: false, badge: 'b', text: 't', href: '/pricing' } }] }, tok)).status, 200);
});
