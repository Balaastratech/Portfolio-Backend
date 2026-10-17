import test from 'node:test';
import assert from 'node:assert/strict';
import { enquirySubject, realBudget } from '../dist/src/utils/contactEmail.js';

test('subject names the person and the product', () => {
    assert.equal(enquirySubject({ name: 'Asha Rao', projectType: 'Lead Response Desk' }), 'New enquiry: Asha Rao - Lead Response Desk');
});

test('subject strips newlines so a visitor cannot inject headers', () => {
    const s = enquirySubject({ name: 'Eve\r\nBcc: x@evil.com', projectType: 'Other\nautomation' });
    assert.doesNotMatch(s, /[\r\n]/);
    assert.equal(s, 'New enquiry: Eve Bcc: x@evil.com - Other automation');
});

test('budget is null when not asked or blank, kept when real', () => {
    assert.equal(realBudget('not asked'), null);
    assert.equal(realBudget('  '), null);
    assert.equal(realBudget(undefined), null);
    assert.equal(realBudget('£5k-10k'), '£5k-10k');
});
