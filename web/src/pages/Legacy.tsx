// Legacy view mock (WO-020): the email-and-meeting CAB process ShipGate replaces.

const thread = [
  { from: 'Marcus Tran', to: 'change-advisory-board@corp', time: 'Tue 4:12 PM', subject: 'CHG-1042 — Add vendor export API — please approve for Thursday window',
    body: 'Hi all, requesting approval for CHG-1042 (vendor export API). Spec + handler were generated with the new tooling. Scanner output attached (3 findings, see PDF). Need this out Thursday for procurement.', attach: 'security-scan-CHG-1042.pdf (412 KB)' },
  { from: 'Dana Whitfield (Security)', to: 'change-advisory-board@corp', time: 'Tue 6:47 PM', subject: 'RE: CHG-1042 …',
    body: 'Flagging finding #1 in the PDF — CRITICAL secret-handling: "live credential detected in generated specification". Can someone confirm before this goes?', attach: null },
  { from: 'Rob Keller (Approver)', to: 'change-advisory-board@corp', time: 'Wed 9:03 AM', subject: 'RE: RE: CHG-1042 …',
    body: 'LGTM, approved — findings are informational. We can clean up the spec after launch. Adding to Thursday\'s list.', attach: null },
  { from: 'CAB Bot', to: 'change-advisory-board@corp', time: 'Thu 10:30 AM', subject: 'RE: RE: RE: CHG-1042 …',
    body: 'Status: APPROVED (1 of 1 approvers). Deployed to production 10:28 AM.', attach: null },
];

export function Legacy() {
  return (
    <div className="legacy">
      <div className="legacy-label">LEGACY VIEW — how CHG-1042 gets approved today (mock)</div>
      <div className="legacy-grid">
        <section className="mail">
          <div className="mail-toolbar">Inbox ▸ CAB approvals ▸ <strong>CHG-1042</strong> <span className="mail-count">(4 messages)</span></div>
          {thread.map((m, i) => (
            <article key={i} className="mail-msg" style={{ marginLeft: i * 18 }}>
              <div className="mail-head">
                <strong>{m.from}</strong> <span className="mail-to">to {m.to}</span>
                <span className="mail-time">{m.time}</span>
              </div>
              <div className="mail-subject">{m.subject}</div>
              <p className={i === 2 ? 'stamp' : ''}>{m.body}</p>
              {m.attach && <div className="mail-attach">📎 {m.attach}</div>}
            </article>
          ))}
        </section>
        <section className="minutes">
          <h3>Weekly CAB meeting — Thursday 9:00 AM</h3>
          <div className="minutes-meta">Attendees: 14 · Duration: 55 min · Changes reviewed: 31</div>
          <h4>Agenda</h4>
          <ol>
            <li>Roll call</li>
            <li>Emergency changes (none)</li>
            <li>Standard changes — batch approval</li>
          </ol>
          <h4>Notes</h4>
          <ul>
            <li>31 changes approved as a batch.</li>
            <li className="stamp">CHG-1042 “Add vendor export API” — approved. Security findings noted as informational (CRITICAL secret-handling: live credential detected in generated specification). No owner assigned.</li>
            <li>Dana to follow up on scanner findings “after launch”.</li>
          </ul>
          <h4>Action items</h4>
          <ul>
            <li>☐ Dana — look at CHG-1042 scan PDF (no due date)</li>
            <li>☐ Rob — circulate next week’s change list by email</li>
          </ul>
          <div className="legacy-foot">
            Evidence of this decision: an email thread, a PDF attachment and meeting notes. No gate. No owner. No tamper-evident record.
          </div>
        </section>
      </div>
      <a className="btn primary legacy-cta" href="#/changes/CHG-1042">See CHG-1042 in ShipGate →</a>
    </div>
  );
}
