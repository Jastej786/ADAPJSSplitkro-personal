// Pure: turns a group document into the reminder emails to send. No network, no secrets.
// Reuses the app's own balance maths so the email always matches what the app shows.
import { debtsFor } from "../js/core/balances.js";
import { fmt } from "../js/core/money.js";
import { normalizeEmail } from "../js/core/email.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Names are user-typed and the group doc is writable by anyone with the link: keep them short and single-line.
const clean = (s, max = 60) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

// Subject for anyone who owes somebody; people who are only owed get "You're owed ₹X in Group".
const DEBTOR_SUBJECT = "paise bhejde bkl";

// Returns [{ email, memberName, owes, owed, net, subject, text, html }] — one per member who has an email
// and an outstanding balance (they owe someone, someone owes them, or both). Settled-up members get nothing.
export function buildReminders(group, siteUrl) {
  if (!group.reminders) return [];

  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const link = `${base}#/g/${group.id}`;
  const groupName = clean(group.name) || "your group";
  const money = (c) => fmt(c, group.currency || "INR");
  const byId = new Map(group.members.map((m) => [m.id, m]));
  const nameOf = (id) => clean(byId.get(id)?.name) || "someone";

  const owes = new Map();  // member id -> [{ who, amount }]  what they must pay
  const owed = new Map();  // member id -> [{ who, amount }]  what they will receive
  const add = (map, id, who, amount) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id).push({ who, amount });
  };
  for (const d of debtsFor(group)) {
    if (!(d.amount > 0)) continue;
    add(owes, d.from, nameOf(d.to), d.amount);
    add(owed, d.to, nameOf(d.from), d.amount);
  }

  const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
  const out = [];

  for (const member of group.members) {
    const email = !member.left ? normalizeEmail(member.email) : null;
    const pay = owes.get(member.id) ?? [];
    const receive = owed.get(member.id) ?? [];
    if (!email || (!pay.length && !receive.length)) continue;

    const name = clean(member.name);
    const net = sum(receive) - sum(pay);
    const headline = net < 0 ? `You owe ${money(-net)}` : net > 0 ? `You're owed ${money(net)}` : "Your balance is even";

    const text = [
      `Hi ${name},`, "",
      `Friendly Friday reminder: here's where you stand in "${groupName}".`, "",
      ...(pay.length ? [`You owe ${money(sum(pay))}:`, ...pay.map((r) => `  • ${money(r.amount)} to ${r.who}`), ""] : []),
      ...(receive.length ? [`You'll receive ${money(sum(receive))}:`, ...receive.map((r) => `  • ${money(r.amount)} from ${r.who}`), ""] : []),
      `Open the group: ${link}`, "",
      "You're getting this because weekly reminders are on for this group. Turn them off in the group's Settings,",
      "or ignore this email if it isn't meant for you.",
    ].join("\n");

    const section = (title, rows, preposition, color) => rows.length ? `
<p style="margin:18px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#7d8982">${esc(title)} · <span style="color:${color}">${esc(money(sum(rows)))}</span></p>
<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7">${rows.map((r) => `<li><strong>${esc(money(r.amount))}</strong> ${preposition} ${esc(r.who)}</li>`).join("")}</ul>` : "";

    const html = `<!doctype html><html><body style="margin:0;background:#f6f4ef;font-family:Helvetica,Arial,sans-serif;color:#16211d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7d8982">${esc(groupName)}</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;line-height:1.2">${esc(headline)}</h1>
<p style="margin:0;font-size:15px">Hi ${esc(name)}, a friendly Friday reminder of where you stand:</p>
${section("You owe", pay, "to", "#c2410c")}${section("You'll receive", receive, "from", "#0e7a5f")}
<p style="margin:24px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#0e6b57;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600;font-size:14px">Open group</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#7d8982;line-height:1.5">You're getting this because weekly reminders are on for this group. Turn them off in the group's Settings, or ignore this email if it isn't meant for you.</p>
</td></tr></table></td></tr></table></body></html>`;

    out.push({ email, memberName: name, owes: sum(pay), owed: sum(receive), net, subject: pay.length ? DEBTOR_SUBJECT : `${headline} in ${groupName}`, text, html });
  }
  return out;
}
