import test from 'node:test';
import assert from 'node:assert/strict';
import { contactDeliveryStatus } from '../dist/src/utils/contactDelivery.js';

test('contact response distinguishes delivered from retained-only submissions', () => {
    assert.equal(contactDeliveryStatus(true), 201);
    assert.equal(contactDeliveryStatus(false), 202);
});
