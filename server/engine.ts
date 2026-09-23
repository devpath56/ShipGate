import {
  type Change, type ChangeState, type Finding, type Gate, type LedgerEvent, type Mode,
  type Policy, type Role, DomainError, MODES, ROLES, severityRank,
} from './domain.js';
import { appendEvent, verifyChain } from './ledger.js';
import { buildSeed } from './seed.js';

// Backend-owned governance engine (WO-003, WO-006, WO-008, WO-010, WO-011).
// Every state change goes through this class; the UI only calls the API.
// Falsifier: in enforced mode no change with an open finding at or above an
// active policy's threshold can reach APPROVED or SHIPPED.

export interface TransitionResult {
  ok: boolean;
  outcome: LedgerEvent['outcome'];
  message: string;
  change: Change;
  event: LedgerEvent;
  blocking?: { policy: Policy; findings: Finding[] }[];
}

const MAX_NOTE = 1000;

export class ShipGateEngine {
  changes = new Map<string, Change>();
  findings = new Map<string, Finding>();
  policies = new Map<string, Policy>();
  ledger: LedgerEvent[] = [];
  mode: Mode = 'advisory';
  dismissedSuggestions = new Set<string>();
  private clock: () => Date;

  constructor(clock: () => Date = () => new Date()) {
    this.clock = clock;
    this.reset();
  }

  reset() {
    const seed = buildSeed();
    this.changes = new Map(seed.changes.map((c) => [c.id, c]));
    this.findings = new Map(seed.findings.map((f) => [f.id, f]));
    this.policies = new Map(seed.policies.map((p) => [p.id, p]));
    this.ledger = seed.ledger;
    this.mode = 'advisory';
    this.dismissedSuggestions = new Set();
  }

  private now() {
    return this.clock().toISOString();
  }

  // ---- reads ---------------------------------------------------------------

  getChange(id: string): Change {
    const change = this.changes.get(id);
    if (!change) throw new DomainError(404, 'NOT_FOUND', `Change ${id} not found.`);
    return change;
  }

  findingsFor(changeId: string): Finding[] {
    return [...this.findings.values()].filter((f) => f.change === changeId);
  }

  activePolicies(): Policy[] {
    return [...this.policies.values()].filter((p) => p.status === 'active');
  }

  /** Open findings that trip each active policy for a change. */
  blockingFor(changeId: string): { policy: Policy; findings: Finding[] }[] {
    const open = this.findingsFor(changeId).filter((f) => f.status === 'open');
    return this.activePolicies()
      .map((policy) => ({
        policy,
        findings: open.filter(
          (f) => policy.applies_to.includes(f.category)
            && severityRank(f.severity) >= severityRank(policy.block_severity_threshold),
        ),
      }))
      .filter((b) => b.findings.length > 0);
  }

  gatesFor(changeId: string): Gate[] {
    const ts = this.now();
    const open = this.findingsFor(changeId).filter((f) => f.status === 'open');
    return this.activePolicies().map((policy) => {
      const hits = open.filter(
        (f) => policy.applies_to.includes(f.category)
          && severityRank(f.severity) >= severityRank(policy.block_severity_threshold),
      );
      return {
        change: changeId,
        policy: policy.id,
        policy_name: policy.name,
        verdict: hits.length ? 'block' : 'allow',
        reason: hits.length
          ? `${hits.length} open ${policy.applies_to.join('/')} finding(s) at ${policy.block_severity_threshold} or above: ${hits.map((h) => `${h.id} (${h.severity.toUpperCase()})`).join(', ')}.`
          : `No open ${policy.applies_to.join('/')} findings at ${policy.block_severity_threshold} or above.`,
        blocking_findings: hits.map((h) => h.id),
        decided_by: 'ShipGate policy engine',
        timestamp: ts,
      };
    });
  }

  verdictFor(changeId: string): 'allow' | 'block' {
    return this.blockingFor(changeId).length ? 'block' : 'allow';
  }

  ledgerFor(changeId: string): LedgerEvent[] {
    return this.ledger.filter((e) => e.change === changeId);
  }

  verify() {
    return verifyChain(this.ledger);
  }

  // ---- validation ------------------------------------------------------------

  static parseRole(value: unknown): Role {
    if (typeof value !== 'string' || !(ROLES as readonly string[]).includes(value)) {
      throw new DomainError(400, 'VALIDATION_ERROR', `Unknown demo role. Allowed: ${ROLES.join(', ')}.`);
    }
    return value as Role;
  }

  static parseMode(value: unknown): Mode {
    if (typeof value !== 'string' || !(MODES as readonly string[]).includes(value)) {
      throw new DomainError(400, 'VALIDATION_ERROR', 'Mode must be "advisory" or "enforced".');
    }
    return value as Mode;
  }

  // ---- commands ----------------------------------------------------------------

  private record(
    change: Change, action: string, to: ChangeState, actor: Role,
    outcome: LedgerEvent['outcome'], note: string,
  ): LedgerEvent {
    const from = change.state;
    change.state = to;
    return appendEvent(this.ledger, {
      change: change.id, action, from_state: from, to_state: to,
      actor, outcome, timestamp: this.now(), note,
    });
  }

  /** Refused attempts are evidence too: append, then throw with the event attached. */
  private refuse(change: Change, action: string, actor: Role, status: number, code: string, message: string): never {
    const event = appendEvent(this.ledger, {
      change: change.id, action, from_state: change.state, to_state: change.state,
      actor, outcome: 'refused', timestamp: this.now(), note: `REFUSED: ${message}`,
    });
    const err = new DomainError(status, code, message) as DomainError & { event?: LedgerEvent };
    err.event = event;
    throw err;
  }

  private requireRole(change: Change, action: string, actor: Role, allowed: Role) {
    if (actor !== allowed) {
      this.refuse(change, action, actor, 403, 'ROLE_FORBIDDEN',
        `${actor} cannot ${action.replace('_', ' ')}. Only ${allowed} can perform this action (demo role control).`);
    }
  }

  private describeBlock(blocking: { policy: Policy; findings: Finding[] }[]) {
    return blocking
      .map((b) => `policy "${b.policy.name}" blocks on ${b.policy.block_severity_threshold} and above — open: ${b.findings.map((f) => `${f.id} ${f.severity.toUpperCase()} ${f.category} ("${f.title}")`).join('; ')}`)
      .join(' | ');
  }

  submit(changeId: string, actor: Role): TransitionResult {
    const change = this.getChange(changeId);
    this.requireRole(change, 'submit', actor, 'Developer');
    if (change.state !== 'DRAFT') {
      this.refuse(change, 'submit', actor, 409, 'INVALID_STATE', `Only DRAFT changes can be submitted; ${change.id} is ${change.state}.`);
    }
    const event = this.record(change, 'submit', 'IN_REVIEW', actor, 'success', 'Submitted for review.');
    return { ok: true, outcome: 'success', message: `${change.id} submitted for review.`, change, event };
  }

  approve(changeId: string, actor: Role): TransitionResult {
    const change = this.getChange(changeId);
    this.requireRole(change, 'approve', actor, 'Approver');
    if (!['IN_REVIEW', 'BLOCKED', 'RESOLVED'].includes(change.state)) {
      this.refuse(change, 'approve', actor, 409, 'INVALID_STATE', `${change.id} is ${change.state} and cannot be approved.`);
    }
    const blocking = this.blockingFor(change.id);

    if (blocking.length && this.mode === 'enforced') {
      const owner = blocking[0].policy.owner_role;
      const reason = `Approval refused — ${this.describeBlock(blocking)}. Routed to ${owner}.`;
      const from = change.state;
      change.state = 'BLOCKED';
      change.routed_to = owner;
      const event = appendEvent(this.ledger, {
        change: change.id, action: 'approve', from_state: from, to_state: 'BLOCKED',
        actor, outcome: 'refused', timestamp: this.now(), note: reason,
      });
      const err = new DomainError(409, 'POLICY_BLOCKED', reason) as DomainError & { event?: LedgerEvent; blocking?: unknown };
      err.event = event;
      err.blocking = blocking;
      throw err;
    }

    if (blocking.length) {
      const top = blocking[0].findings[0];
      const event = this.record(change, 'approve', 'APPROVED', actor, 'advisory_exception',
        `Approved with open ${top.severity.toUpperCase()} ${top.category} finding (advisory mode) — ${this.describeBlock(blocking)}.`);
      return { ok: true, outcome: 'advisory_exception', message: `${change.id} approved despite open ${top.severity.toUpperCase()} finding (advisory mode).`, change, event, blocking };
    }

    change.routed_to = null;
    const event = this.record(change, 'approve', 'APPROVED', actor, 'success', 'All active policy gates allow. Approved.');
    return { ok: true, outcome: 'success', message: `${change.id} approved.`, change, event };
  }

  ship(changeId: string, actor: Role): TransitionResult {
    const change = this.getChange(changeId);
    this.requireRole(change, 'ship', actor, 'Approver');
    if (change.state !== 'APPROVED') {
      this.refuse(change, 'ship', actor, 409, 'INVALID_STATE', `${change.id} must be APPROVED before it can ship; it is ${change.state}.`);
    }
    // Re-evaluate at ship time: an advisory approval does not survive a switch to enforced mode.
    const blocking = this.blockingFor(change.id);

    if (blocking.length && this.mode === 'enforced') {
      const owner = blocking[0].policy.owner_role;
      const reason = `Shipment refused — ${this.describeBlock(blocking)}. Routed to ${owner}.`;
      change.state = 'BLOCKED';
      change.routed_to = owner;
      const event = appendEvent(this.ledger, {
        change: change.id, action: 'ship', from_state: 'APPROVED', to_state: 'BLOCKED',
        actor, outcome: 'refused', timestamp: this.now(), note: reason,
      });
      const err = new DomainError(409, 'POLICY_BLOCKED', reason) as DomainError & { event?: LedgerEvent; blocking?: unknown };
      err.event = event;
      err.blocking = blocking;
      throw err;
    }

    if (blocking.length) {
      const top = blocking[0].findings[0];
      change.shipped_with_exception = true;
      const event = this.record(change, 'ship', 'SHIPPED', actor, 'advisory_exception',
        `Shipped with open ${top.severity.toUpperCase()} ${top.category} finding (advisory mode) — ${this.describeBlock(blocking)}.`);
      return { ok: true, outcome: 'advisory_exception', message: `${change.id} SHIPPED with an open ${top.severity.toUpperCase()} finding (advisory mode).`, change, event, blocking };
    }

    const event = this.record(change, 'ship', 'SHIPPED', actor, 'success', 'Shipped to production. All gates allow.');
    return { ok: true, outcome: 'success', message: `${change.id} shipped.`, change, event };
  }

  resolveFinding(findingId: string, actor: Role, rawNote: unknown): TransitionResult {
    const finding = this.findings.get(findingId);
    if (!finding) throw new DomainError(404, 'NOT_FOUND', `Finding ${findingId} not found.`);
    const change = this.getChange(finding.change);
    this.requireRole(change, 'resolve_finding', actor, 'Security Owner');
    const note = typeof rawNote === 'string' ? rawNote.trim() : '';
    if (!note) {
      throw new DomainError(400, 'NOTE_REQUIRED', 'A resolution note is required — describe the remediation (e.g. credential rotated and removed from spec).');
    }
    if (note.length > MAX_NOTE) {
      throw new DomainError(400, 'VALIDATION_ERROR', `Resolution note must be ${MAX_NOTE} characters or fewer.`);
    }
    if (finding.status === 'resolved') {
      throw new DomainError(409, 'ALREADY_RESOLVED', `${finding.id} is already resolved.`);
    }

    finding.status = 'resolved';
    finding.resolution_note = note;
    finding.resolved_by = actor;
    let event = appendEvent(this.ledger, {
      change: change.id, action: 'resolve_finding', from_state: change.state, to_state: change.state,
      actor, outcome: 'success', timestamp: this.now(),
      note: `Resolved ${finding.id} (${finding.severity.toUpperCase()} ${finding.category}): ${note}`,
    });

    let message = `${finding.id} resolved.`;
    if (change.state === 'BLOCKED' && this.blockingFor(change.id).length === 0) {
      change.routed_to = null;
      event = this.record(change, 'gate_reevaluated', 'RESOLVED', actor, 'success',
        'All blocking findings resolved. Gate re-evaluated: ALLOW. Ready for re-approval.');
      message = `${finding.id} resolved — gate now ALLOWS. ${change.id} is RESOLVED and ready for re-approval.`;
    }
    return { ok: true, outcome: 'success', message, change, event };
  }

  setMode(mode: Mode, actor: Role): LedgerEvent {
    const prev = this.mode;
    this.mode = mode;
    return appendEvent(this.ledger, {
      change: null, action: 'set_mode', from_state: null, to_state: null, actor,
      outcome: 'system', timestamp: this.now(), note: `Enforcement mode changed: ${prev} → ${mode}.`,
    });
  }

  // ---- policy suggestion (AI layer, draft-only) ------------------------------------

  adoptDraftPolicy(p: Omit<Policy, 'status'>) {
    if (this.policies.has(p.id)) throw new DomainError(409, 'ALREADY_EXISTS', 'Policy already adopted.');
    const policy: Policy = { ...p, status: 'draft' };
    this.policies.set(policy.id, policy);
    appendEvent(this.ledger, {
      change: null, action: 'adopt_draft_policy', from_state: null, to_state: null, actor: 'Security Owner',
      outcome: 'system', timestamp: this.now(), note: `Draft policy "${policy.name}" added from AI suggestion (not enforcing).`,
    });
    return policy;
  }
}
