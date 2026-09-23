import Fastify, { type FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DomainError, type Role } from './domain.js';
import { ShipGateEngine } from './engine.js';
import { answer, explainFinding, policySuggestion, riskSummary } from './ai.js';

// Versioned REST API (WO-007, WO-009, WO-012, WO-013). Command endpoints only;
// the frontend never mutates governance state directly.

export function buildApp(engine = new ShipGateEngine()) {
  const app = Fastify({ logger: false });

  const roleOf = (body: unknown): Role => ShipGateEngine.parseRole((body as { role?: unknown })?.role);

  const fail = (reply: FastifyReply, err: unknown) => {
    if (err instanceof DomainError) {
      const e = err as DomainError & { event?: unknown; blocking?: unknown };
      return reply.status(e.status).send({ ok: false, error: { code: e.code, message: e.message }, event: e.event ?? null, blocking: e.blocking ?? null });
    }
    console.error(err);
    return reply.status(500).send({ ok: false, error: { code: 'INTERNAL', message: 'Unexpected error — try Reset demo.' } });
  };

  const changeView = (id: string) => {
    const c = engine.getChange(id);
    const findings = engine.findingsFor(id);
    return {
      ...c,
      verdict: engine.verdictFor(id),
      open_findings: findings.filter((f) => f.status === 'open').length,
      top_severity: findings.filter((f) => f.status === 'open')
        .map((f) => f.severity).sort((a, b) => ['info', 'low', 'medium', 'high', 'critical'].indexOf(b) - ['info', 'low', 'medium', 'high', 'critical'].indexOf(a))[0] ?? null,
      ai_one_line: riskSummary(engine, id).oneLine,
    };
  };

  app.get('/api/v1/health', async () => ({ ok: true }));

  app.get('/api/v1/mode', async () => ({ ok: true, data: { mode: engine.mode } }));
  app.post('/api/v1/mode', async (req, reply) => {
    try {
      const body = req.body as { mode?: unknown; role?: unknown };
      const mode = ShipGateEngine.parseMode(body?.mode);
      const event = engine.setMode(mode, roleOf(body));
      return { ok: true, data: { mode }, event };
    } catch (err) { return fail(reply, err); }
  });

  app.post('/api/v1/reset', async () => {
    engine.reset();
    return { ok: true, data: { mode: engine.mode, message: 'Demo reset: seed data restored, mode set to advisory.' } };
  });

  app.get('/api/v1/changes', async () => ({ ok: true, data: [...engine.changes.keys()].map(changeView) }));

  app.get('/api/v1/changes/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const view = changeView(id);
      const blocking = engine.blockingFor(id);
      return {
        ok: true,
        data: {
          change: view,
          findings: engine.findingsFor(id).map((f) => ({ ...f, ai: explainFinding(f) })),
          policies: engine.activePolicies(),
          gates: engine.gatesFor(id),
          blocking,
          ledger: engine.ledgerFor(id),
          ai_summary: riskSummary(engine, id),
          mode: engine.mode,
        },
      };
    } catch (err) { return fail(reply, err); }
  });

  for (const action of ['submit', 'approve', 'ship'] as const) {
    app.post(`/api/v1/changes/:id/${action}`, async (req, reply) => {
      try {
        const { id } = req.params as { id: string };
        const result = engine[action](id, roleOf(req.body));
        return { ok: true, data: result };
      } catch (err) { return fail(reply, err); }
    });
  }

  app.post('/api/v1/findings/:id/resolve', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as { note?: unknown };
      return { ok: true, data: engine.resolveFinding(id, roleOf(req.body), body?.note) };
    } catch (err) { return fail(reply, err); }
  });

  app.get('/api/v1/policies', async () => ({
    ok: true,
    data: { policies: [...engine.policies.values()], suggestion: policySuggestion(engine) },
  }));

  app.post('/api/v1/policies/suggestion/accept', async (req, reply) => {
    try {
      const s = policySuggestion(engine);
      if (!s) throw new DomainError(404, 'NO_SUGGESTION', 'No suggestion available.');
      const { rationale: _r, evidence: _e, ...policy } = s;
      return { ok: true, data: engine.adoptDraftPolicy(policy) };
    } catch (err) { return fail(reply, err); }
  });

  app.post('/api/v1/policies/suggestion/dismiss', async () => {
    engine.dismissedSuggestions.add('POL-SUG-DEPRISK');
    return { ok: true };
  });

  app.get('/api/v1/ledger', async () => ({ ok: true, data: { events: engine.ledger, verification: engine.verify() } }));
  app.get('/api/v1/ledger/verify', async () => ({ ok: true, data: engine.verify() }));

  app.post('/api/v1/assistant', async (req) => {
    const body = req.body as { question?: unknown; change?: unknown };
    const question = typeof body?.question === 'string' ? body.question.slice(0, 500) : '';
    const change = typeof body?.change === 'string' ? body.change : null;
    return { ok: true, data: { answer: answer(engine, change, question) } };
  });

  // Serve the built SPA in production.
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  if (existsSync(dist)) {
    app.register(fastifyStatic, { root: dist });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.status(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });
      return reply.sendFile('index.html');
    });
  }

  return app;
}
