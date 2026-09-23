import { describe, expect, it } from 'vitest';
import { ShipGateEngine } from './engine.js';
import { answer } from './ai.js';

const fixedClock = () => new Date('2026-09-23T20:00:00.000Z');

describe('ShipGate enforcement (the demo falsifier)', () => {
  it('advisory mode: CHG-1042 is approved and SHIPPED despite the CRITICAL finding', () => {
    const e = new ShipGateEngine(fixedClock);
    expect(e.approve('CHG-1042', 'Approver').outcome).toBe('advisory_exception');
    const shipped = e.ship('CHG-1042', 'Approver');
    expect(shipped.change.state).toBe('SHIPPED');
    expect(shipped.event.note).toMatch(/advisory mode/);
  });

  it('enforced mode: the identical approval is refused, BLOCKED, routed, and logged', () => {
    const e = new ShipGateEngine(fixedClock);
    e.setMode('enforced', 'Approver');
    expect(() => e.approve('CHG-1042', 'Approver')).toThrow(/Secrets must not ship/);
    const c = e.getChange('CHG-1042');
    expect(c.state).toBe('BLOCKED');
    expect(c.routed_to).toBe('Security Owner');
    expect(e.ledger.at(-1)?.outcome).toBe('refused');
  });

  it('no flagged change can reach SHIPPED in enforced mode, even after an advisory approval', () => {
    const e = new ShipGateEngine(fixedClock);
    e.approve('CHG-1042', 'Approver');
    e.setMode('enforced', 'Approver');
    expect(() => e.ship('CHG-1042', 'Approver')).toThrow(/Shipment refused/);
    expect(e.getChange('CHG-1042').state).toBe('BLOCKED');
  });

  it('resolve with note → RESOLVED → re-approve → SHIPPED; ledger shows BLOCKED → RESOLVED → SHIPPED', () => {
    const e = new ShipGateEngine(fixedClock);
    e.setMode('enforced', 'Approver');
    expect(() => e.approve('CHG-1042', 'Approver')).toThrow();
    expect(() => e.resolveFinding('F-2001', 'Approver', 'x')).toThrow(/Only Security Owner/);
    expect(() => e.resolveFinding('F-2001', 'Security Owner', '   ')).toThrow(/note is required/);
    e.resolveFinding('F-2001', 'Security Owner', 'Credential rotated; removed from spec.');
    expect(e.getChange('CHG-1042').state).toBe('RESOLVED');
    e.approve('CHG-1042', 'Approver');
    expect(e.ship('CHG-1042', 'Approver').change.state).toBe('SHIPPED');
    const states = e.ledgerFor('CHG-1042').map((ev) => ev.to_state);
    expect(states).toEqual(expect.arrayContaining(['BLOCKED', 'RESOLVED', 'APPROVED', 'SHIPPED']));
    expect(e.verify().intact).toBe(true);
  });

  it('Judge / Guest cannot change state, even via direct calls', () => {
    const e = new ShipGateEngine(fixedClock);
    expect(() => e.approve('CHG-1043', 'Judge / Guest')).toThrow(/Only Approver/);
    expect(e.getChange('CHG-1043').state).toBe('IN_REVIEW');
  });

  it('tampering with any past ledger event breaks the chain', () => {
    const e = new ShipGateEngine(fixedClock);
    expect(e.verify().intact).toBe(true);
    e.ledger[3].note = 'edited after the fact';
    const v = e.verify();
    expect(v.intact).toBe(false);
    expect(v.broken_at).toBe(4);
  });

  it('reset restores seed state and advisory mode', () => {
    const e = new ShipGateEngine(fixedClock);
    e.setMode('enforced', 'Approver');
    expect(() => e.approve('CHG-1042', 'Approver')).toThrow();
    e.reset();
    expect(e.mode).toBe('advisory');
    expect(e.getChange('CHG-1042').state).toBe('IN_REVIEW');
    expect(e.findings.get('F-2001')?.status).toBe('open');
  });

  it('assistant answers "why is CHG-1042 blocked?" citing the policy and the critical finding', () => {
    const e = new ShipGateEngine(fixedClock);
    const a = answer(e, null, 'why is CHG-1042 blocked?');
    expect(a).toMatch(/Secrets must not ship/);
    expect(a).toMatch(/F-2001 CRITICAL/);
  });
});

describe('assistant intent routing', () => {
  it('"what would unblock it?" returns remediation, not the block reason', () => {
    const e = new ShipGateEngine(fixedClock);
    const a = answer(e, 'CHG-1042', 'what would unblock it?');
    expect(a).toMatch(/To unblock CHG-1042/);
    expect(a).toMatch(/Rotate the credential/);
  });
});

describe('audit fixes', () => {
  it('detects a deleted ledger tail (truncation) via the head anchor', () => {
    const e = new ShipGateEngine(fixedClock);
    e.setMode('enforced', 'Approver');
    expect(() => e.approve('CHG-1042', 'Approver')).toThrow();
    e.ledger.pop();
    const v = e.verify();
    expect(v.intact).toBe(false);
    expect(v.message).toMatch(/truncated/);
  });

  it('Judge / Guest cannot change the enforcement mode', () => {
    const e = new ShipGateEngine(fixedClock);
    expect(() => e.setMode('enforced', 'Judge / Guest')).toThrow(/view-only/);
    expect(e.mode).toBe('advisory');
  });

  it.each(['how do I cook pasta?', 'who won the world cup?', 'what is the capital of France?', 'tell me a joke'])(
    'assistant declines off-topic question: %s',
    (q) => {
      const e = new ShipGateEngine(fixedClock);
      expect(answer(e, 'CHG-1042', q)).toMatch(/I can only answer about this change's governance data/);
    },
  );

  it('assistant answers "what is waiting on the Security Owner?" after an enforced refusal', () => {
    const e = new ShipGateEngine(fixedClock);
    e.setMode('enforced', 'Approver');
    expect(() => e.approve('CHG-1042', 'Approver')).toThrow();
    expect(answer(e, 'CHG-1042', 'What is waiting on the Security Owner?')).toMatch(/CHG-1042.*F-2001 CRITICAL/);
  });
});
