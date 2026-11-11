import assert from 'node:assert/strict';
import test from 'node:test';

import { cardMayPlay, playArc, resolveDragRelease } from './cardPlayMotion';

test('an illegal drop snaps back and a lift toward the pile plays', () => {
  const pile = [{ value: 8 }];
  assert.equal(cardMayPlay({ value: 4 }, pile), false);
  assert.equal(cardMayPlay({ value: 9 }, pile), true);
  assert.equal(cardMayPlay({ value: 2 }, pile), true);
  assert.equal(
    resolveDragRelease({ x: 200, y: 300, pileX: 200, pileY: 160, handTop: 280, playable: false }),
    'snap',
  );
  assert.equal(
    resolveDragRelease({ x: 200, y: 300, pileX: 200, pileY: 160, handTop: 280, playable: true }),
    'snap',
  );
  assert.equal(
    resolveDragRelease({ x: 210, y: 170, pileX: 200, pileY: 160, handTop: 280, playable: true }),
    'play',
  );
  assert.equal(
    resolveDragRelease({ x: 40, y: 200, pileX: 200, pileY: 160, handTop: 280, playable: true }),
    'play',
  );
});

test('the play arc rises above the straight path from either side', () => {
  const self = playArc({ x: 200, y: 320 }, { x: 200, y: 160 }, 'self');
  const opp = playArc({ x: 200, y: 40 }, { x: 200, y: 160 }, 'opponent');
  assert.ok(self.y < 160);
  assert.ok(opp.y < 40);
  assert.ok(self.x !== opp.x);
});
