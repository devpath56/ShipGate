import { createHash } from 'node:crypto';
import type { LedgerEvent } from './domain.js';

// Hash-chained ledger (WO-004). Each event's hash covers its content plus the
// previous event's hash, so editing any past event breaks every later link.

export const GENESIS_HASH = '0'.repeat(64);

type EventBody = Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>;

export function hashEvent(e: Omit<LedgerEvent, 'hash'>): string {
  const canonical = JSON.stringify([
    e.seq, e.change, e.action, e.from_state, e.to_state,
    e.actor, e.outcome, e.timestamp, e.note, e.prev_hash,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}

export function appendEvent(ledger: LedgerEvent[], body: EventBody): LedgerEvent {
  const prev = ledger[ledger.length - 1];
  const partial = {
    ...body,
    seq: ledger.length + 1,
    prev_hash: prev ? prev.hash : GENESIS_HASH,
  };
  const event: LedgerEvent = { ...partial, hash: hashEvent(partial) };
  ledger.push(event);
  return event;
}

export interface ChainVerification {
  intact: boolean;
  checked: number;
  broken_at: number | null;
  message: string;
}

/** The head anchor is recorded outside the event array; comparing against it catches a deleted tail. */
export interface HeadAnchor { seq: number; hash: string }

export function verifyChain(ledger: LedgerEvent[], anchor?: HeadAnchor): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (const e of ledger) {
    const { hash, ...rest } = e;
    if (e.prev_hash !== prevHash || hashEvent(rest) !== hash) {
      return {
        intact: false,
        checked: ledger.length,
        broken_at: e.seq,
        message: `Chain broken at event #${e.seq}: its hash no longer matches its contents or its link to #${e.seq - 1}.`,
      };
    }
    prevHash = hash;
  }
  const last = ledger[ledger.length - 1];
  if (anchor && (!last || last.seq !== anchor.seq || last.hash !== anchor.hash)) {
    return {
      intact: false,
      checked: ledger.length,
      broken_at: (last?.seq ?? 0) + 1,
      message: `Chain truncated: the recorded head is event #${anchor.seq} (${anchor.hash.slice(0, 8)}…) but the ledger ends at #${last?.seq ?? 0}. ${anchor.seq - (last?.seq ?? 0)} event(s) are missing.`,
    };
  }
  return {
    intact: true,
    checked: ledger.length,
    broken_at: null,
    message: `Chain intact — all ${ledger.length} events verified with SHA-256.`,
  };
}
