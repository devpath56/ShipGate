import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

// HTTP-level tests through Fastify's inject: the same boundary a judge's curl hits.

const post = (app: ReturnType<typeof buildApp>, url: string, payload?: unknown, raw = false) =>
  app.inject({ method: 'POST', url, headers: { 'content-type': 'application/json' }, payload: raw ? (payload as string) : payload === undefined ? '' : JSON.stringify(payload) });

describe('ShipGate REST API', () => {
  it('POST /reset with an empty JSON body succeeds', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/reset');
    expect(r.statusCode).toBe(200);
    expect(r.json().data.mode).toBe('advisory');
  });

  it('POST /mode accepts a body without role (WO-008 AC)', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/mode', { mode: 'enforced' });
    expect(r.statusCode).toBe(200);
    expect((await app.inject('/api/v1/mode')).json().data.mode).toBe('enforced');
  });

  it('POST /mode as Judge / Guest is forbidden', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/mode', { mode: 'enforced', role: 'Judge / Guest' });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('malformed JSON stays inside the error envelope', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/changes/CHG-1042/approve', '{not json', true);
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ ok: false, error: { code: 'INVALID_JSON' } });
  });

  it('empty body on a command returns a validation error in the envelope', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/changes/CHG-1042/approve');
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('invalid change id is rejected before lookup', async () => {
    const app = buildApp();
    const r = await post(app, '/api/v1/changes/DROP%20TABLE/approve', { role: 'Approver' });
    expect(r.statusCode).toBe(400);
  });

  it('enforced approve of CHG-1042 → 409 POLICY_BLOCKED with the refusal ledgered', async () => {
    const app = buildApp();
    await post(app, '/api/v1/mode', { mode: 'enforced', role: 'Approver' });
    const r = await post(app, '/api/v1/changes/CHG-1042/approve', { role: 'Approver' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe('POLICY_BLOCKED');
    const d = (await app.inject('/api/v1/changes/CHG-1042')).json().data;
    expect(d.change.state).toBe('BLOCKED');
    expect(d.ledger.at(-1).outcome).toBe('refused');
    expect(d.ledger.every((e: { link_ok: boolean }) => e.link_ok)).toBe(true);
  });

  it('unknown API path → 404 envelope', async () => {
    const app = buildApp();
    const r = await app.inject('/api/v1/nope');
    expect(r.statusCode).toBe(404);
    expect(r.json().ok).toBe(false);
  });
});
