import assert from "node:assert/strict";
import test from "node:test";
import { classifyDuoWindow, DUO_CREASE_BAND } from "./duoLayout";

test("folded Duo stays a single column", () => {
  const folded = classifyDuoWindow(382, 597);
  assert.equal(folded.mode, "compact");
  assert.equal(folded.hinge, "none");
  assert.equal(folded.creaseBand, 0);

  const foldedLandscape = classifyDuoWindow(597, 382);
  assert.equal(foldedLandscape.mode, "compact");
});

test("unfolded Duo opens a vertical crease at the midpoint", () => {
  const open = classifyDuoWindow(951, 669);
  assert.equal(open.mode, "wide");
  assert.equal(open.hinge, "vertical");
  assert.equal(open.creaseCenter, 475.5);
  assert.equal(open.creaseBand, DUO_CREASE_BAND);
  assert.ok(open.creaseStart < 475 && open.creaseEnd > 475);
});

test("unfolded portrait uses a horizontal crease", () => {
  const turned = classifyDuoWindow(669, 951);
  assert.equal(turned.mode, "tall");
  assert.equal(turned.hinge, "horizontal");
  assert.equal(turned.creaseCenter, 475.5);
});

test("a normal phone landscape does not invent a hinge", () => {
  const phone = classifyDuoWindow(932, 430);
  assert.equal(phone.mode, "compact");
  assert.equal(phone.hinge, "none");
});
