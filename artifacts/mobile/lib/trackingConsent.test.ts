import assert from 'node:assert/strict';
import test from 'node:test';

import { personalizedAdsAllowed } from './trackingConsent';

test('only a granted tracking answer allows personalized ads', () => {
  assert.equal(personalizedAdsAllowed('granted'), true);
  for (const status of ['denied', 'restricted', 'undetermined', '', null, undefined]) {
    assert.equal(personalizedAdsAllowed(status), false);
  }
});
