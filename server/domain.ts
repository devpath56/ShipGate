// Shared ShipGate domain contracts (WO-001). One authoritative model for
// severities, states, roles, modes, verdicts and entities.

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const severityRank = (s: Severity) => SEVERITIES.indexOf(s);

export const CATEGORIES = [
  'prompt injection',
  'tool exfiltration',
  'scope creep',
  'secret handling',
  'dependency risk',
  'compliance gaps',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATES = ['DRAFT', 'IN_REVIEW', 'BLOCKED', 'RESOLVED', 'APPROVED', 'SHIPPED'] as const;
export type ChangeState = (typeof STATES)[number];

export const ROLES = ['Developer', 'Approver', 'Security Owner', 'Judge / Guest'] as const;
export type Role = (typeof ROLES)[number];

export const MODES = ['advisory', 'enforced'] as const;
export type Mode = (typeof MODES)[number];

export type FindingStatus = 'open' | 'resolved';
export type Verdict = 'allow' | 'block';

export interface Change {
  id: string;
  title: string;
  source: string;
  summary: string;
  state: ChangeState;
  author: string;
  routed_to: Role | null;
  shipped_with_exception: boolean;
}

export interface Finding {
  id: string;
  change: string;
  category: Category;
  severity: Severity;
  status: FindingStatus;
  title: string;
  detail: string;
  resolution_note?: string;
  resolved_by?: Role;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  block_severity_threshold: Severity;
  owner_role: Role;
  applies_to: Category[];
  status: 'active' | 'draft';
}

export interface Gate {
  change: string;
  policy: string;
  policy_name: string;
  verdict: Verdict;
  reason: string;
  blocking_findings: string[];
  decided_by: string;
  timestamp: string;
}

export type LedgerOutcome = 'success' | 'refused' | 'advisory_exception' | 'system';

export interface LedgerEvent {
  seq: number;
  change: string | null;
  action: string;
  from_state: ChangeState | null;
  to_state: ChangeState | null;
  actor: string;
  outcome: LedgerOutcome;
  timestamp: string;
  note: string;
  prev_hash: string;
  hash: string;
}

export class DomainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
