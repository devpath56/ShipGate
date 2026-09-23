import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type ChangeDetail, type Finding, type Verification } from '../api';
import { useApp } from '../App';
import { AiLabel, fmtTime, SeverityBadge, shortHash, SimLabel, Skeleton, StatePill } from '../ui';

// Change detail (WO-023, WO-026–029): verdict banner, actions, AI summary,
// findings with explanations, policy evaluation, gate verdict, ledger, assistant.

function VerdictBanner({ d }: { d: ChangeDetail }) {
  const { change, blocking, mode } = d;
  if (change.state === 'SHIPPED' && change.shipped_with_exception) {
    return (
      <div className="banner exception">
        <div className="banner-icon" aria-hidden>!</div>
        <div>
          <div className="banner-title">SHIPPED with an open CRITICAL finding — advisory mode</div>
          <div>The scanner flagged it. The approval shipped it anyway. This is the legacy failure mode ShipGate exists to prevent.</div>
        </div>
      </div>
    );
  }
  if (!blocking.length) {
    return (
      <div className="banner allow">
        <div className="banner-icon" aria-hidden>✓</div>
        <div>
          <div className="banner-title">Gate verdict: ALLOW</div>
          <div>No open finding meets an active policy threshold.</div>
        </div>
      </div>
    );
  }
  const b = blocking[0];
  const binding = mode === 'enforced';
  return (
    <div className={`banner ${binding ? 'block' : 'advisory'}`} role="alert">
      <div className="banner-icon" aria-hidden>{binding ? '⛔' : '!'}</div>
      <div className="banner-body">
        <div className="banner-title">
          {binding ? `BLOCKED by policy “${b.policy.name}”` : `Policy “${b.policy.name}” would block this — advisory mode only warns`}
        </div>
        <div>
          Open {b.findings.map((f) => `${f.severity.toUpperCase()} ${f.category}`).join(', ')} finding{b.findings.length > 1 ? 's' : ''} ({b.findings.map((f) => f.id).join(', ')}) at or above the <strong>{b.policy.block_severity_threshold}</strong> threshold.
        </div>
        <div className="banner-route">
          Owner: <strong>{b.policy.owner_role}</strong>
          {change.routed_to ? <span className="routed">→ Routed to {change.routed_to} queue</span> : binding ? <span className="muted"> · approval attempts will be refused and routed</span> : null}
        </div>
      </div>
    </div>
  );
}

function Actions({ d, reload }: { d: ChangeDetail; reload: () => void }) {
  const { role, toast, refresh } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const { change } = d;

  const run = async (action: 'submit' | 'approve' | 'ship') => {
    setBusy(action);
    try {
      const r = await api.act(change.id, action, role);
      toast(r.outcome === 'advisory_exception' ? 'warn' : 'success', r.message);
    } catch (e) {
      const err = e as ApiError;
      toast('error', err.code === 'POLICY_BLOCKED' ? `Refused by policy. ${err.message}` : err.message);
    }
    setBusy(null);
    reload(); refresh();
  };

  const canApproveState = ['IN_REVIEW', 'BLOCKED', 'RESOLVED'].includes(change.state);
  const buttons: { key: 'submit' | 'approve' | 'ship'; label: string; who: string; enabled: boolean; why: string }[] = [
    { key: 'submit', label: 'Submit for review', who: 'Developer', enabled: role === 'Developer' && change.state === 'DRAFT',
      why: role !== 'Developer' ? 'Only a Developer can submit.' : 'Only DRAFT changes can be submitted.' },
    { key: 'approve', label: 'Approve', who: 'Approver', enabled: role === 'Approver' && canApproveState,
      why: role !== 'Approver' ? 'Only an Approver can approve.' : `Cannot approve a ${change.state} change.` },
    { key: 'ship', label: 'Ship to production', who: 'Approver', enabled: role === 'Approver' && change.state === 'APPROVED',
      why: role !== 'Approver' ? 'Only an Approver can ship.' : 'Change must be APPROVED first.' },
  ];
  const relevant = buttons.filter((b) => !(b.key === 'submit' && change.state !== 'DRAFT'));

  return (
    <div className="panel actions">
      <div className="panel-head"><h3>Actions</h3><span className="muted small">Acting as <strong>{role}</strong></span></div>
      {change.state === 'SHIPPED'
        ? <p className="muted">This change has shipped. Its evidence is preserved in the ledger below.</p>
        : (
          <div className="action-row">
            {relevant.map((b) => (
              <div key={b.key} className="action">
                <button
                  className={`btn ${b.key === 'ship' ? 'primary' : b.key === 'approve' ? 'primary-outline' : ''}`}
                  disabled={!b.enabled || busy !== null}
                  onClick={() => run(b.key)}
                >
                  {busy === b.key ? 'Working…' : b.label}
                </button>
                {!b.enabled && <div className="why">{b.why}</div>}
              </div>
            ))}
          </div>
        )}
      {role === 'Judge / Guest' && <p className="muted small">Judge / Guest is view-only. Switch role in the header to try the flow.</p>}
    </div>
  );
}

function FindingRow({ f, reload }: { f: Finding; reload: () => void }) {
  const { role, toast, refresh } = useApp();
  const [open, setOpen] = useState(f.severity === 'critical' && f.status === 'open');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resolve = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.resolve(f.id, role, note);
      toast('success', r.message);
      setNote('');
      reload(); refresh();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <li className={`finding ${f.status}`}>
      <div className="finding-top">
        <SeverityBadge severity={f.severity} />
        <span className="cat">{f.category}</span>
        <span className="mono muted small">{f.id}</span>
        <span className={`status-chip ${f.status}`}>{f.status}</span>
      </div>
      <div className="finding-title">{f.title}</div>
      <div className="finding-detail">{f.detail}</div>
      <button className="linkish" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'Hide explanation' : 'What does this mean?'}
      </button>
      {open && (
        <div className="ai-box">
          <AiLabel />
          <p><strong>What this means:</strong> {f.ai.meaning}</p>
          <p><strong>Suggested fix:</strong> {f.ai.fix}</p>
        </div>
      )}
      {f.status === 'resolved' && f.resolution_note && (
        <div className="resolution">Resolved by {f.resolved_by}: “{f.resolution_note}”</div>
      )}
      {f.status === 'open' && role === 'Security Owner' && (
        <div className="resolve-form">
          <label htmlFor={`note-${f.id}`}>Resolution note (required)</label>
          <textarea id={`note-${f.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
            placeholder="e.g. Credential rotated in vault; removed from spec and git history." rows={2} />
          {err && <div className="field-error">{err}</div>}
          <button className="btn primary small" onClick={resolve} disabled={busy}>{busy ? 'Resolving…' : 'Resolve finding'}</button>
        </div>
      )}
      {f.status === 'open' && role !== 'Security Owner' && (
        <div className="why">Only the Security Owner can resolve findings.</div>
      )}
    </li>
  );
}

function Ledger({ d }: { d: ChangeDetail }) {
  const [v, setV] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const verify = async () => { setBusy(true); try { setV(await api.verify()); } catch { /* shown via null */ } setBusy(false); };
  useEffect(() => setV(null), [d.ledger.length]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Evidence ledger</h3>
        <button className="btn small" onClick={verify} disabled={busy}>{busy ? 'Verifying…' : 'Verify chain'}</button>
      </div>
      {v && <div className={`verify ${v.intact ? 'ok' : 'bad'}`}>{v.intact ? '🔒 ' : '⚠ '}{v.message}</div>}
      <ol className="timeline">
        {d.ledger.map((e, i) => (
          <li key={e.seq} className={`tl ${e.outcome}`}>
            <div className="tl-dot" aria-hidden />
            <div className="tl-body">
              <div className="tl-head">
                <span className="tl-transition">
                  {e.from_state && e.to_state && e.from_state !== e.to_state
                    ? <><StatePill state={e.from_state} /> → <StatePill state={e.to_state} /></>
                    : <span className="tl-action">{e.action.replace(/_/g, ' ')}</span>}
                </span>
                {e.outcome === 'refused' && <span className="outcome refused">REFUSED</span>}
                {e.outcome === 'advisory_exception' && <span className="outcome exception">ADVISORY EXCEPTION</span>}
              </div>
              <div className="tl-note">{e.note}</div>
              <div className="tl-meta">
                <span>#{e.seq}</span><span>{e.actor}</span><span>{fmtTime(e.timestamp)}</span>
                <span className="chain" title={`prev ${e.prev_hash}\nhash ${e.hash}`}>
                  🔗 {shortHash(e.prev_hash)} → {shortHash(e.hash)}
                </span>
              </div>
              {i < d.ledger.length - 1 && <div className="tl-link" aria-hidden />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Assistant({ changeId }: { changeId: string }) {
  const { tick } = useApp();
  const [msgs, setMsgs] = useState<{ who: 'you' | 'ai'; text: string }[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const suggestions = [`Why is ${changeId} blocked?`, 'What would unblock it?', 'Which findings are still open?', 'What is waiting on the Security Owner?'];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs]);
  useEffect(() => setMsgs([]), [changeId]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setMsgs((m) => [...m, { who: 'you', text: question }]);
    setQ(''); setBusy(true);
    try {
      const r = await api.ask(question, changeId);
      setMsgs((m) => [...m, { who: 'ai', text: r.answer }]);
    } catch (e) { setMsgs((m) => [...m, { who: 'ai', text: `Sorry — ${(e as Error).message}` }]); }
    setBusy(false);
  };
  void tick;

  return (
    <div className="panel assistant">
      <div className="panel-head"><h3>Governance assistant</h3><AiLabel text="AI · grounded in live data" /></div>
      <div className="chat">
        {msgs.length === 0 && <div className="muted small">Ask about this change — answers cite the real findings, policy and ledger.</div>}
        {msgs.map((m, i) => <div key={i} className={`msg ${m.who}`}>{m.text}</div>)}
        {busy && <div className="msg ai typing">Reasoning over findings, policies and ledger…</div>}
        <div ref={endRef} />
      </div>
      <div className="chips">
        {suggestions.map((s) => <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
      </div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this change…" aria-label="Ask the governance assistant" />
        <button className="btn primary small" disabled={busy || !q.trim()}>Ask</button>
      </form>
    </div>
  );
}

export function ChangeDetailPage({ id }: { id: string }) {
  const { tick } = useApp();
  const [d, setD] = useState<ChangeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const reload = () => setN((x) => x + 1);

  useEffect(() => {
    api.change(id).then((x) => { setD(x); setError(null); }).catch((e) => setError(e.message));
  }, [id, tick, n]);

  if (error) return <div className="empty">Could not load {id}: {error} <a href="#/">Back to dashboard</a></div>;
  if (!d) return <div className="panel"><Skeleton lines={6} /></div>;

  const { change } = d;
  const open = d.findings.filter((f) => f.status === 'open');
  return (
    <>
      <a href="#/" className="back">← Gate dashboard</a>
      <section className="detail-head">
        <div>
          <div className="mono muted">{change.id} · {change.source} · by {change.author}</div>
          <h1>{change.title}</h1>
          <p className="muted">{change.summary}</p>
        </div>
        <StatePill state={change.state} />
      </section>

      <VerdictBanner d={d} />

      <div className="detail-grid">
        <div className="col-main">
          <Actions d={d} reload={reload} />

          <div className="panel ai-summary">
            <div className="panel-head"><h3>AI risk summary</h3><AiLabel text="AI-generated summary" /></div>
            <div className="ai-headline">{d.ai_summary.headline}</div>
            {d.ai_summary.sentences.map((s, i) => <p key={i}>{s}</p>)}
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Findings <span className="muted">({open.length} open of {d.findings.length})</span></h3><SimLabel /></div>
            {d.findings.length
              ? <ul className="findings">{d.findings.map((f) => <FindingRow key={f.id} f={f} reload={reload} />)}</ul>
              : <div className="empty">No findings reported by the security feed for this change.</div>}
          </div>

          <Ledger d={d} />
        </div>

        <div className="col-side">
          <div className="panel">
            <div className="panel-head"><h3>Policy evaluation</h3></div>
            {d.gates.map((g) => (
              <div key={g.policy} className={`gate ${g.verdict}`}>
                <div className="gate-top">
                  <strong>{g.policy_name}</strong>
                  <span className={`verdict ${g.verdict}`}>{g.verdict.toUpperCase()}</span>
                </div>
                <div className="small muted">Blocks on {d.policies.find((p) => p.id === g.policy)?.block_severity_threshold}+ · {d.policies.find((p) => p.id === g.policy)?.applies_to.join(', ')} · owner {d.policies.find((p) => p.id === g.policy)?.owner_role}</div>
                <div className="small">{g.reason}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Gate verdict</h3></div>
            <div className={`big-verdict ${change.verdict}`}>{change.verdict === 'block' ? (d.mode === 'enforced' ? 'BLOCK' : 'BLOCK (advisory — not binding)') : 'ALLOW'}</div>
            <dl className="kv">
              <dt>Decided by</dt><dd>{d.gates[0]?.decided_by ?? 'ShipGate policy engine'}</dd>
              <dt>Mode</dt><dd>{d.mode}</dd>
              <dt>Evaluated</dt><dd>{d.gates[0] ? fmtTime(d.gates[0].timestamp) : '—'}</dd>
            </dl>
          </div>

          <Assistant changeId={change.id} />
        </div>
      </div>
    </>
  );
}
