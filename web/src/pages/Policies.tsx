import { useEffect, useState } from 'react';
import { api, type Policy, type Suggestion } from '../api';
import { useApp } from '../App';
import { AiLabel, SeverityBadge, Skeleton } from '../ui';

// Policy list (WO-019) + AI policy suggestion (draft-only, does not enforce).

export function Policies() {
  const { tick, toast, refresh } = useApp();
  const [data, setData] = useState<{ policies: Policy[]; suggestion: Suggestion | null } | null>(null);

  useEffect(() => { api.policies().then(setData).catch((e) => toast('error', e.message)); }, [tick, toast]);

  if (!data) return <div className="panel"><Skeleton lines={4} /></div>;
  const active = data.policies.filter((p) => p.status === 'active');
  const drafts = data.policies.filter((p) => p.status === 'draft');

  const accept = async () => {
    try { const p = await api.acceptSuggestion(); toast('success', `Draft policy “${p.name}” added. It does not enforce until activated.`); refresh(); }
    catch (e) { toast('error', (e as Error).message); }
  };
  const dismiss = async () => {
    try { await api.dismissSuggestion(); toast('info', 'Suggestion dismissed.'); refresh(); }
    catch (e) { toast('error', (e as Error).message); }
  };

  const PolicyCard = ({ p }: { p: Policy }) => (
    <div className={`policy ${p.status}`}>
      <div className="policy-top">
        <div>
          <span className="mono muted small">{p.id}</span>
          <h3>{p.name}</h3>
        </div>
        <span className={`policy-status ${p.status}`}>{p.status === 'active' ? 'Active · enforcing' : 'Draft · not enforcing'}</span>
      </div>
      <p>{p.description}</p>
      <dl className="kv inline">
        <dt>Blocks at</dt><dd><SeverityBadge severity={p.block_severity_threshold} /> and above</dd>
        <dt>Applies to</dt><dd>{p.applies_to.join(', ')}</dd>
        <dt>Owner</dt><dd>{p.owner_role}</dd>
      </dl>
    </div>
  );

  return (
    <>
      <section className="hero">
        <div>
          <h1>Blocking policies</h1>
          <p className="muted">The rules that turn advisory findings into binding gates. Each policy names the role that owns its exceptions.</p>
        </div>
      </section>

      <div className="grid-2">
        <section className="column">
          <div className="col-head"><h2>Active policies</h2><span className="count">{active.length}</span></div>
          {active.length ? active.map((p) => <PolicyCard key={p.id} p={p} />)
            : <div className="empty">No active blocking policy — every change would pass its gate.</div>}
          {drafts.length > 0 && (
            <>
              <div className="col-head"><h2>Draft policies</h2><span className="count">{drafts.length}</span></div>
              {drafts.map((p) => <PolicyCard key={p.id} p={p} />)}
            </>
          )}
        </section>

        <section className="column">
          <div className="col-head"><h2>AI suggestions</h2><AiLabel /></div>
          {data.suggestion ? (
            <div className="policy suggestion">
              <div className="policy-top">
                <div>
                  <span className="mono muted small">Suggested from finding patterns</span>
                  <h3>{data.suggestion.name}</h3>
                </div>
                <SeverityBadge severity={data.suggestion.block_severity_threshold} />
              </div>
              <p><strong>Why:</strong> {data.suggestion.rationale}</p>
              <ul className="evidence">{data.suggestion.evidence.map((e) => <li key={e} className="mono small">{e}</li>)}</ul>
              <dl className="kv inline">
                <dt>Proposed threshold</dt><dd>{data.suggestion.block_severity_threshold} and above</dd>
                <dt>Owner</dt><dd>{data.suggestion.owner_role}</dd>
              </dl>
              <div className="btn-row">
                <button className="btn primary" onClick={accept}>Accept as draft</button>
                <button className="btn ghost" onClick={dismiss}>Dismiss</button>
              </div>
            </div>
          ) : (
            <div className="empty">No new suggestions. ShipGate proposes a policy when a finding category repeats across changes without a covering gate.</div>
          )}
        </section>
      </div>
    </>
  );
}
