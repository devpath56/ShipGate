import type { Category, Finding, Policy } from './domain.js';
import { severityRank } from './domain.js';
import type { ShipGateEngine } from './engine.js';

// AI-native layer. Deterministic generation grounded in live governance data:
// no API keys, no network, identical output on every demo take.

const CATEGORY_MEANING: Record<Category, string> = {
  'secret handling': 'a credential or secret is exposed where it can be copied, leaked or shipped to production',
  'dependency risk': 'a third-party library in this change carries a known weakness that attackers can target',
  'compliance gaps': 'the change is missing evidence or controls an auditor will expect to see',
  'prompt injection': 'untrusted text can rewrite the instructions an AI agent follows',
  'tool exfiltration': 'an agent tool can send internal context to an endpoint outside your control',
  'scope creep': 'generated code goes beyond what was approved in the specification',
};

const CATEGORY_FIX: Record<Category, string> = {
  'secret handling': 'Rotate the exposed credential immediately, remove it from the specification and code, and load it from the secrets manager at runtime.',
  'dependency risk': 'Upgrade to the patched version (or pin a safe version) and re-run the dependency scan.',
  'compliance gaps': 'Add the missing annotation or evidence hook and link it in the change record.',
  'prompt injection': 'Delimit untrusted input, move it out of the system prompt, and add an instruction-override test.',
  'tool exfiltration': 'Restrict the tool to an allow-list of internal endpoints and strip context from outbound payloads.',
  'scope creep': 'Revert the out-of-spec edits or amend the specification and get it re-approved.',
};

export function explainFinding(f: Finding) {
  let meaning = `This means ${CATEGORY_MEANING[f.category]}.`;
  let fix = CATEGORY_FIX[f.category];
  if (f.id === 'F-2001' || (f.category === 'secret handling' && /credential/i.test(f.detail))) {
    meaning = 'A live credential was detected in the generated specification — anyone who can read the spec or the shipped artifact can use that key against the vendor API.';
    fix = 'Rotate the credential now (treat it as compromised), remove it from the generated specification and its history, and reference it from the secrets manager instead.';
  }
  return { meaning, fix };
}

const sevWord = (f: Finding) => f.severity.toUpperCase();

export function riskSummary(engine: ShipGateEngine, changeId: string) {
  const change = engine.getChange(changeId);
  const open = engine.findingsFor(changeId).filter((f) => f.status === 'open')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const blocking = engine.blockingFor(changeId);

  if (!open.length) {
    const resolved = engine.findingsFor(changeId).length;
    return {
      headline: 'No open risk',
      oneLine: resolved ? 'All findings resolved — no open risk.' : 'Clean — no findings from the security feed.',
      sentences: [
        resolved
          ? `${change.id} has no open findings; ${resolved} finding(s) were resolved with recorded notes.`
          : `${change.id} has no findings from the simulated security feed.`,
        'Every active policy gate allows this change to proceed.',
      ],
    };
  }

  const top = open[0];
  const cats = [...new Set(open.map((f) => f.category))];
  const sentences = [
    `${change.id} has ${open.length} open finding${open.length > 1 ? 's' : ''}; the most serious is ${sevWord(top)} ${top.category}: ${top.title.toLowerCase()}.`,
    `If this ships as-is, ${CATEGORY_MEANING[top.category]}.`,
  ];
  if (cats.length > 1) sentences.push(`Other risk areas involved: ${cats.slice(1).join(', ')}.`);
  if (blocking.length) {
    const b = blocking[0];
    sentences.push(engine.mode === 'enforced'
      ? `Shippability: BLOCKED by "${b.policy.name}" until the ${b.policy.owner_role} resolves ${b.findings.map((x) => x.id).join(', ')}.`
      : `Shippability: "${b.policy.name}" would block this, but advisory mode lets an approver ship it anyway.`);
  } else {
    sentences.push('Shippability: no active policy blocks it — the open findings are below every blocking threshold.');
  }

  return {
    headline: blocking.length ? 'Policy-blocking risk' : `${sevWord(top)} risk, not blocking`,
    oneLine: blocking.length
      ? `${sevWord(top)} ${top.category} — blocked by "${blocking[0].policy.name}".`
      : `${open.length} open ${top.severity}-or-lower finding${open.length > 1 ? 's' : ''}; no policy blocks.`,
    sentences: sentences.slice(0, 4),
  };
}

// ---- policy suggestion -------------------------------------------------------------

export function policySuggestion(engine: ShipGateEngine): (Omit<Policy, 'status'> & { rationale: string; evidence: string[] }) | null {
  const id = 'POL-SUG-DEPRISK';
  if (engine.policies.has(id) || engine.dismissedSuggestions.has(id)) return null;
  const covered = (f: Finding) => engine.activePolicies().some(
    (p) => p.applies_to.includes(f.category) && severityRank(f.severity) >= severityRank(p.block_severity_threshold),
  );
  const byCat = new Map<Category, Finding[]>();
  for (const f of engine.findings.values()) {
    if (f.severity === 'medium' && !covered(f)) byCat.set(f.category, [...(byCat.get(f.category) ?? []), f]);
  }
  const [cat, hits] = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!cat || !hits || hits.length < 2) return null;
  const changes = [...new Set(hits.map((h) => h.change))];
  const nearProd = changes.find((id) => ['APPROVED', 'SHIPPED'].includes(engine.changes.get(id)?.state ?? ''));
  return {
    id,
    name: `${cat[0].toUpperCase()}${cat.slice(1)}: block on medium and above`,
    description: `Block shipment while an open ${cat} finding at medium severity or above exists.`,
    block_severity_threshold: 'medium',
    owner_role: 'Security Owner',
    applies_to: [cat],
    rationale: `${hits.length} medium ${cat} findings across ${changes.length} changes (${changes.join(', ')}) pass every current gate because no active policy covers ${cat}.${nearProd ? ` ${nearProd} is already ${engine.changes.get(nearProd)?.state} with its finding still open.` : ''}`,
    evidence: hits.map((h) => `${h.id} · ${h.change} · ${h.title}`),
  };
}

// ---- conversational assistant ------------------------------------------------------

const OUT_OF_SCOPE = "I can only answer about this change's governance data — its findings, policies, gate verdict and ledger. Try \"why is it blocked?\", \"what would unblock it?\" or \"which findings are still open?\".";

export function answer(engine: ShipGateEngine, contextChangeId: string | null, question: string): string {
  const q = question.toLowerCase().trim();
  if (!q) return 'Ask me about a change — for example "why is CHG-1042 blocked?" or "what would unblock it?".';

  // Scope guard: answer only questions about governance data. Without this,
  // generic words ("how do", "who") would route off-topic questions to an answer.
  const GOVERNANCE = /chg-\d{4}|\bchange\b|block|finding|polic|gate|ledger|audit|risk|ship|approv|resolv|security owner|queue|routed|owner|remediat|fix\b|credential|secret|mode|enforc|advisory|verdict|status|state|history|timeline|open\b|this one|\bit\b|safe/;
  if (!GOVERNANCE.test(q)) return OUT_OF_SCOPE;

  const mentioned = q.match(/chg-\d{4}/i)?.[0]?.toUpperCase();
  const targetId = mentioned ?? contextChangeId;

  if (/security owner|waiting on|queue|routed/.test(q) && !mentioned) {
    const routed = [...engine.changes.values()].filter((c) => c.routed_to === 'Security Owner');
    if (!routed.length) return 'Nothing is currently routed to the Security Owner. Changes land in that queue when an enforced-mode approval is refused by a policy the Security Owner owns.';
    return `Waiting on the Security Owner: ${routed.map((c) => `${c.id} "${c.title}" (${engine.blockingFor(c.id).flatMap((b) => b.findings.map((f) => `${f.id} ${f.severity.toUpperCase()}`)).join(', ')})`).join('; ')}.`;
  }

  if (!targetId || !engine.changes.has(targetId)) {
    return "I can only answer about this change's governance data — its findings, policies, gate verdict and ledger. Try naming a change, e.g. CHG-1042.";
  }

  const change = engine.getChange(targetId);
  const findings = engine.findingsFor(targetId);
  const open = findings.filter((f) => f.status === 'open');
  const blocking = engine.blockingFor(targetId);
  const events = engine.ledgerFor(targetId);
  const last = events[events.length - 1];
  const list = (fs: Finding[]) => fs.map((f) => `${f.id} ${f.severity.toUpperCase()} ${f.category} — "${f.title}"`).join('; ');

  const wantsUnblock = /unblock|\bfix|remediat|what would|next step|how (do|can) (i|we) (ship|resolve|approve|clear)/.test(q);

  if (!wantsUnblock && /why|blocked|block/.test(q)) {
    if (!blocking.length) {
      return `${change.id} is not blocked: every active policy gate allows it (state: ${change.state}). ${open.length ? `It has ${open.length} open finding(s), all below blocking thresholds: ${list(open)}.` : 'It has no open findings.'}`;
    }
    const b = blocking[0];
    const refused = [...events].reverse().find((e) => e.outcome === 'refused');
    return `${change.id} is blocked by the policy "${b.policy.name}", which blocks on ${b.policy.block_severity_threshold} and above for ${b.policy.applies_to.join(', ')}. The open blocking finding is ${list(b.findings)}. ${engine.mode === 'enforced'
      ? `In enforced mode any approval or shipment is refused${refused ? ` — the last refusal was ledger event #${refused.seq} by the ${refused.actor}` : ''}, and the change is routed to the ${b.policy.owner_role}.`
      : 'Right now the app is in advisory mode, so an approver could still ship it — switch to enforced mode to make the gate binding.'}`;
  }

  if (wantsUnblock) {
    if (!blocking.length) return `${change.id} has nothing blocking it. Next step: ${change.state === 'APPROVED' ? 'an Approver can ship it.' : change.state === 'SHIPPED' ? 'none — it has shipped.' : change.state === 'DRAFT' ? 'the Developer submits it for review.' : 'an Approver can approve it.'}`;
    return blocking.map((b) => `To unblock ${change.id}: the ${b.policy.owner_role} must resolve ${b.findings.map((f) => `${f.id} (${explainFinding(f).fix})`).join(' ')} with a written note. The gate then re-evaluates to ALLOW, the change moves to RESOLVED, and an Approver can re-approve and ship.`).join(' ');
  }

  if (/open|finding|issues/.test(q)) {
    return open.length ? `${change.id} has ${open.length} open finding(s): ${list(open)}.` : `${change.id} has no open findings.`;
  }

  if (/history|ledger|who (approved|shipped|resolved|submitted|refused)|timeline|audit/.test(q)) {
    return `${change.id} has ${events.length} ledger events. Latest: #${last?.seq} ${last?.action} by ${last?.actor} (${last?.from_state} → ${last?.to_state}) — "${last?.note}". Chain status: ${engine.verify().message}`;
  }

  if (/risk|summar|safe|ship/.test(q)) {
    return riskSummary(engine, targetId).sentences.join(' ');
  }

  if (/status|state/.test(q)) {
    return `${change.id} is ${change.state}; gate verdict ${engine.verdictFor(targetId).toUpperCase()}; mode ${engine.mode}.`;
  }

  return OUT_OF_SCOPE;
}
