// Typed ShipGate API client (WO-014). The only path the UI has to state.

export type Role = 'Developer' | 'Approver' | 'Security Owner' | 'Judge / Guest';
export type Mode = 'advisory' | 'enforced';
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type ChangeState = 'DRAFT' | 'IN_REVIEW' | 'BLOCKED' | 'RESOLVED' | 'APPROVED' | 'SHIPPED';

export interface ChangeView {
  id: string; title: string; source: string; summary: string; state: ChangeState; author: string;
  routed_to: Role | null; shipped_with_exception: boolean;
  verdict: 'allow' | 'block'; open_findings: number; top_severity: Severity | null; ai_one_line: string;
}
export interface Finding {
  id: string; change: string; category: string; severity: Severity; status: 'open' | 'resolved';
  title: string; detail: string; resolution_note?: string; resolved_by?: Role;
  ai: { meaning: string; fix: string };
}
export interface Policy {
  id: string; name: string; description: string; block_severity_threshold: Severity;
  owner_role: Role; applies_to: string[]; status: 'active' | 'draft';
}
export interface Gate {
  change: string; policy: string; policy_name: string; verdict: 'allow' | 'block';
  reason: string; blocking_findings: string[]; decided_by: string; timestamp: string;
}
export interface LedgerEvent {
  seq: number; change: string | null; action: string; from_state: ChangeState | null; to_state: ChangeState | null;
  actor: string; outcome: 'success' | 'refused' | 'advisory_exception' | 'system';
  timestamp: string; note: string; prev_hash: string; hash: string;
}
export interface ChangeDetail {
  change: ChangeView; findings: Finding[]; policies: Policy[]; gates: Gate[];
  blocking: { policy: Policy; findings: Finding[] }[]; ledger: LedgerEvent[];
  ai_summary: { headline: string; oneLine: string; sentences: string[] }; mode: Mode;
}
export interface Verification { intact: boolean; checked: number; broken_at: number | null; message: string }
export interface Suggestion extends Omit<Policy, 'status'> { rationale: string; evidence: string[] }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, body === undefined
    ? {}
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ ok: false, error: { code: 'NETWORK', message: 'Server unreachable.' } }));
  if (!res.ok || !json.ok) throw new ApiError(res.status, json.error?.code ?? 'ERROR', json.error?.message ?? 'Request failed.');
  return json.data as T;
}

export const api = {
  mode: () => call<{ mode: Mode }>('/mode'),
  setMode: (mode: Mode, role: Role) => call<{ mode: Mode }>('/mode', { mode, role }),
  reset: () => call<{ message: string }>('/reset', {}),
  changes: () => call<ChangeView[]>('/changes'),
  change: (id: string) => call<ChangeDetail>(`/changes/${id}`),
  act: (id: string, action: 'submit' | 'approve' | 'ship', role: Role) =>
    call<{ message: string; outcome: string }>(`/changes/${id}/${action}`, { role }),
  resolve: (findingId: string, role: Role, note: string) =>
    call<{ message: string }>(`/findings/${findingId}/resolve`, { role, note }),
  policies: () => call<{ policies: Policy[]; suggestion: Suggestion | null }>('/policies'),
  acceptSuggestion: () => call<Policy>('/policies/suggestion/accept', {}),
  dismissSuggestion: () => call<unknown>('/policies/suggestion/dismiss', {}),
  ledger: () => call<{ events: LedgerEvent[]; verification: Verification }>('/ledger'),
  verify: () => call<Verification>('/ledger/verify'),
  ask: (question: string, change: string | null) => call<{ answer: string }>('/assistant', { question, change }),
};
