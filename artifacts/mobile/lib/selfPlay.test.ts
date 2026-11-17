import assert from 'node:assert/strict';
import test from 'node:test';

import { selfPlayPresentation } from './selfPlay';

test('only the local player’s normal play drops the cinematic chrome', () => {
  const mine = selfPlayPresentation({ side: 'self', type: 'normal' });
  assert.equal(mine.flightMs, 260);
  assert.equal(mine.anticipationMs, 0);
  assert.equal(mine.spotlight, false);
  assert.equal(mine.hand, false);

  const reset = selfPlayPresentation({ side: 'self', type: 'reset' });
  assert.equal(reset.flightMs, 480);
  assert.equal(reset.spotlight, true);
  assert.equal(reset.hand, true);

  const opponent = selfPlayPresentation({ side: 'opponent', type: 'normal' });
  assert.equal(opponent.flightMs, 480);
  assert.equal(opponent.spotlight, true);
  assert.equal(opponent.hand, false);

  for (const type of ['burn', 'set_complete', 'face_down_bust']) {
    const special = selfPlayPresentation({ side: 'self', type });
    assert.equal(special.flightMs, 480, type);
    assert.equal(special.spotlight, true, type);
  }
});
