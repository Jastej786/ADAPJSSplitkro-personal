// Pure balance maths. No DOM, no storage.

const live = (list) => (list ?? []).filter((x) => !x.deleted);

// Net position per member: positive = is owed money, negative = owes money.
export function netBalances(group) {
  const net = Object.fromEntries(group.members.map((m) => [m.id, 0]));
  for (const e of live(group.expenses)) {
    for (const [id, c] of Object.entries(e.payers)) net[id] = (net[id] ?? 0) + c;
    for (const [id, c] of Object.entries(e.owed)) net[id] = (net[id] ?? 0) - c;
  }
  for (const s of live(group.settlements)) {
    net[s.from] = (net[s.from] ?? 0) + s.amount;
    net[s.to] = (net[s.to] ?? 0) - s.amount;
  }
  return net;
}

// Greedy "minimum cash flow": fewest transfers that clear all nets.
// Returns [{ from: debtor, to: creditor, amount }].
export function minimizeTransfers(net) {
  const debtors = [], creditors = [];
  for (const [id, v] of Object.entries(net)) {
    if (v < 0) debtors.push({ id, v: -v });
    else if (v > 0) creditors.push({ id, v });
  }
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

// Un-simplified debts: who owes whom as the expenses actually happened,
// with opposite directions between the same pair netted off.
export function pairwiseDebts(group) {
  const owes = new Map(); // "from>to" -> cents
  const add = (from, to, amount) => {
    if (from === to || amount === 0) return;
    owes.set(`${from}>${to}`, (owes.get(`${from}>${to}`) ?? 0) + amount);
  };

  for (const e of live(group.expenses)) {
    const net = {};
    for (const [id, c] of Object.entries(e.payers)) net[id] = (net[id] ?? 0) + c;
    for (const [id, c] of Object.entries(e.owed)) net[id] = (net[id] ?? 0) - c;
    minimizeTransfers(net).forEach((t) => add(t.from, t.to, t.amount));
  }
  // A settlement "A paid B" cancels debt A→B, i.e. adds debt B→A.
  for (const s of live(group.settlements)) add(s.to, s.from, s.amount);

  const out = [];
  for (const [key, amount] of owes) {
    const [from, to] = key.split(">");
    const back = owes.get(`${to}>${from}`) ?? 0;
    if (amount > back) out.push({ from, to, amount: amount - back });
  }
  return out;
}

export function debtsFor(group) {
  return group.simplify === false ? pairwiseDebts(group) : minimizeTransfers(netBalances(group));
}
