import test from "node:test";
import assert from "node:assert/strict";
import { allocate, computeOwed } from "../js/core/splits.js";
import { netBalances, minimizeTransfers, pairwiseDebts } from "../js/core/balances.js";

const group = (expenses, settlements = []) => ({
  members: [{ id: "a" }, { id: "b" }, { id: "c" }], expenses, settlements,
});

test("equal split never loses a cent", () => {
  const owed = allocate(1000, ["a", "b", "c"], { a: 1, b: 1, c: 1 });
  assert.equal(Object.values(owed).reduce((x, y) => x + y, 0), 1000);
});

test("percent split must total 100", () => {
  assert.ok(computeOwed(1000, "percent", ["a", "b"], { a: "60", b: "30" }).error);
  assert.deepEqual(computeOwed(1000, "percent", ["a", "b"], { a: "60", b: "40" }).owed, { a: 600, b: 400 });
});

test("exact split must match total", () => {
  assert.ok(computeOwed(1000, "exact", ["a", "b"], { a: "4", b: "5" }).error);
  assert.ok(computeOwed(1000, "exact", ["a", "b"], { a: "4", b: "6" }).owed);
});

test("balances sum to zero and settlements clear debt", () => {
  const e = { payers: { a: 900 }, owed: { a: 300, b: 300, c: 300 } };
  let net = netBalances(group([e]));
  assert.deepEqual(net, { a: 600, b: -300, c: -300 });
  net = netBalances(group([e], [{ from: "b", to: "a", amount: 300 }]));
  assert.equal(net.b, 0);
  assert.equal(Object.values(net).reduce((x, y) => x + y, 0), 0);
});

test("simplify chains: a owes b, b owes c  =>  a pays c", () => {
  const t = minimizeTransfers({ a: -100, b: 0, c: 100 });
  assert.deepEqual(t, [{ from: "a", to: "c", amount: 100 }]);
});

test("pairwise debts keep original direction and net opposite pairs", () => {
  const e1 = { payers: { a: 1000 }, owed: { a: 500, b: 500 } }; // b owes a 500
  const e2 = { payers: { b: 200 }, owed: { a: 100, b: 100 } };  // a owes b 100
  assert.deepEqual(pairwiseDebts(group([e1, e2])), [{ from: "b", to: "a", amount: 400 }]);
});

test("deleted expenses are ignored", () => {
  const e = { payers: { a: 900 }, owed: { b: 900 }, deleted: true };
  assert.deepEqual(netBalances(group([e])), { a: 0, b: 0, c: 0 });
});
