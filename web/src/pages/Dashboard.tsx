import { useEffect, useState } from 'react';
import { api, type ChangeView } from '../api';
import { useApp } from '../App';
import { AiLabel, SeverityBadge, Skeleton, StatePill } from '../ui';

// Gate dashboard (WO-022): queue grouped by gate verdict, exception counts.

function ChangeCard({ c }: { c: ChangeView }) {
  return (
    <a className={`change-card ${c.verdict}`} href={`#/changes/${c.id}`}>
      <div className="cc-top">
        <span className="mono muted">{c.id}</span>
        <StatePill state={c.state} />
      </div>
      <div className="cc-title">{c.title}</div>
      <div className="cc-meta">
        {c.top_severity ? <SeverityBadge severity={c.top_severity} /> : <span className="clean">✓ No open findings</span>}
        {c.open_findings > 0 && <span className="muted small">{c.open_findings} open</span>}
        {c.routed_to && <span className="routed">→ {c.routed_to}</span>}
        {c.shipped_with_exception && <span className="exception-badge">Shipped with open CRITICAL (advisory)</span>}
      </div>
      <div className="cc-ai"><AiLabel text="AI" /> {c.ai_one_line}</div>
    </a>
  );
}

export function Dashboard() {
  const { tick, mode } = useApp();
  const [changes, setChanges] = useState<ChangeView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.changes().then((d) => { setChanges(d); setError(null); }).catch((e) => setError(e.message));
  }, [tick]);

  if (error) return <div className="empty">Could not load the change queue: {error}. Try <strong>Reset demo</strong>.</div>;
  if (!changes) return <div className="grid-2"><div className="panel"><Skeleton lines={5} /></div><div className="panel"><Skeleton lines={5} /></div></div>;

  const blocked = changes.filter((c) => c.verdict === 'block');
  const allowed = changes.filter((c) => c.verdict === 'allow');
  const openFindings = changes.reduce((n, c) => n + c.open_findings, 0);
  const secQueue = changes.filter((c) => c.routed_to === 'Security Owner');
  const exceptions = changes.filter((c) => c.shipped_with_exception);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Release gate</h1>
          <p className="muted">Every production change is evaluated against blocking policies. Only exceptions need a human.</p>
        </div>
        <div className={`mode-callout ${mode}`}>
          {mode === 'enforced'
            ? <><strong>Enforced mode</strong> — a flagged change cannot ship until its policy owner resolves the finding.</>
            : <><strong>Advisory mode</strong> — findings are informational; flagged changes ship if someone approves (legacy baseline).</>}
        </div>
      </section>

      <section className="stats">
        <div className="stat"><div className="stat-n">{changes.length}</div><div className="stat-l">Changes in pipeline</div></div>
        <div className="stat danger"><div className="stat-n">{blocked.length}</div><div className="stat-l">Blocked by policy</div></div>
        <div className="stat"><div className="stat-n">{openFindings}</div><div className="stat-l">Open findings</div></div>
        <div className="stat warn"><div className="stat-n">{secQueue.length}</div><div className="stat-l">Waiting on Security Owner</div></div>
        <div className="stat"><div className="stat-n">{exceptions.length}</div><div className="stat-l">Shipped with exceptions</div></div>
      </section>

      {secQueue.length > 0 && (
        <section className="queue-banner">
          <strong>Security Owner queue</strong>
          {secQueue.map((c) => <a key={c.id} href={`#/changes/${c.id}`}>{c.id} · {c.title}</a>)}
        </section>
      )}

      <div className="grid-2">
        <section className="column">
          <div className="col-head">
            <h2><span className="dot block" /> Blocked by policy</h2>
            <span className="count">{blocked.length} · exceptions to act on</span>
          </div>
          {blocked.length ? blocked.map((c) => <ChangeCard key={c.id} c={c} />)
            : <div className="empty">No changes are blocked. Every open finding is below its policy threshold.</div>}
        </section>
        <section className="column">
          <div className="col-head">
            <h2><span className="dot allow" /> Gates allow</h2>
            <span className="count">{allowed.length} · no blocking findings</span>
          </div>
          {allowed.length ? allowed.map((c) => <ChangeCard key={c.id} c={c} />)
            : <div className="empty">No changes currently pass every gate.</div>}
        </section>
      </div>
    </>
  );
}
