import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getServiceDisplayLabel,
  normalizeServiceValue
} from '../../lib/validation/business-profile.ts';
import { updateBusinessProfileMutationSchema } from '../../lib/validation/mutations.ts';

test('normalizeServiceValue accepts each supported home service', () => {
  assert.equal(normalizeServiceValue('plumbing'), 'plumbing');
  assert.equal(normalizeServiceValue('HVAC'), 'hvac');
  assert.equal(normalizeServiceValue('electrician'), 'electrical');
  assert.equal(normalizeServiceValue('roofing'), 'roofing');
});

test('normalizeServiceValue rejects unsupported services', () => {
  assert.equal(normalizeServiceValue('cleaning'), null);
  assert.equal(normalizeServiceValue('landscaping'), null);
});

test('getServiceDisplayLabel returns friendly labels', () => {
  assert.equal(getServiceDisplayLabel('plumbing'), 'Plumbing');
  assert.equal(getServiceDisplayLabel('hvac'), 'HVAC');
  assert.equal(getServiceDisplayLabel('electrical'), 'Electrical');
  assert.equal(getServiceDisplayLabel('roofing'), 'Roofing');
  assert.equal(getServiceDisplayLabel('cleaning'), '');
});

test('business profile mutation schema normalizes supported verticals', () => {
  const result = updateBusinessProfileMutationSchema.safeParse({
    vertical: 'HVAC'
  });

  assert.equal(result.success, true);
  assert.equal(result.success && result.data.vertical, 'hvac');
});

test('business profile mutation schema rejects unsupported verticals', () => {
  const result = updateBusinessProfileMutationSchema.safeParse({
    vertical: 'cleaning'
  });

  assert.equal(result.success, false);
});
