import { useEffect, useState } from 'react';
import { api, type LedgerEvent, type Verification } from '../api';
import { useApp } from '../App';
import { fmtTime, shortHash, Skeleton } from '../ui';

// Global audit ledger: every transition, refusal and mode change, hash-chained.

export function LedgerPage() {
  const { tick } = useApp();
  const [data, setData] = useState<{ events: LedgerEvent[]; verification: Verification } | null>(null);
  const [v, setV] = useState<Verification | null>(null);

  useEffect(() => { api.ledger().then((d) => { setData(d); setV(null); }).catch(() => {}); }, [tick]);
  if (!data) return <div className="panel"><Skeleton lines={6} /></div>;

  const events = [...data.events].reverse();
  const refused = data.events.filter((e) => e.outcome === 'refused').length;
  const exceptions = data.events.filter((e) => e.outcome === 'advisory_exception').length;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Audit ledger</h1>
          <p className="muted">Append-only, SHA-256 hash-chained. Refused attempts are recorded as evidence, not discarded.</p>
        </div>
        <button className="btn primary" onClick={async () => setV(await api.verify())}>Verify entire chain</button>
      </section>
      {v && <div className={`verify ${v.intact ? 'ok' : 'bad'}`}>{v.intact ? '🔒 ' : '⚠ '}{v.message}</div>}
      <section className="stats">
        <div className="stat"><div className="stat-n">{data.events.length}</div><div className="stat-l">Events</div></div>
        <div className="stat danger"><div className="stat-n">{refused}</div><div className="stat-l">Refused attempts</div></div>
        <div className="stat warn"><div className="stat-n">{exceptions}</div><div className="stat-l">Advisory exceptions</div></div>
      </section>
      <div className="panel table-wrap">
        <table className="ledger-table">
          <thead><tr><th>#</th><th>Change</th><th>Event</th><th>Actor</th><th>Time</th><th>Note</th><th>Chain</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.seq} className={e.outcome}>
                <td className="mono">{e.seq}</td>
                <td>{e.change ? <a href={`#/changes/${e.change}`} className="mono">{e.change}</a> : <span className="muted">system</span>}</td>
                <td>
                  {e.from_state && e.to_state && e.from_state !== e.to_state ? `${e.from_state} → ${e.to_state}` : e.action.replace(/_/g, ' ')}
                  {e.outcome === 'refused' && <span className="outcome refused">REFUSED</span>}
                  {e.outcome === 'advisory_exception' && <span className="outcome exception">EXCEPTION</span>}
                </td>
                <td>{e.actor}</td>
                <td className="nowrap">{fmtTime(e.timestamp)}</td>
                <td className="note-cell">{e.note}</td>
                <td className="mono small nowrap" title={`prev ${e.prev_hash}\nhash ${e.hash}`}>🔗 {shortHash(e.hash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
