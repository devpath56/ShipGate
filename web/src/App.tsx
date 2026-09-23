import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Mode, type Role } from './api';
import { Dashboard } from './pages/Dashboard';
import { ChangeDetailPage } from './pages/ChangeDetail';
import { Policies } from './pages/Policies';
import { LedgerPage } from './pages/Ledger';
import { Legacy } from './pages/Legacy';

// App shell (WO-015/016/017/021/024/025): hash routing, demo role and mode
// controls, reset, toasts. Role is demo context, not authentication.

type ToastKind = 'success' | 'error' | 'warn' | 'info';
interface Toast { id: number; kind: ToastKind; text: string }

interface Ctx {
  role: Role; mode: Mode; tick: number;
  setRole: (r: Role) => void;
  refresh: () => void;
  toast: (kind: ToastKind, text: string) => void;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

const ROLES: Role[] = ['Developer', 'Approver', 'Security Owner', 'Judge / Guest'];
const ROLE_HELP: Record<Role, string> = {
  Developer: 'can submit DRAFT changes for review.',
  Approver: 'can approve and ship changes the gate allows.',
  'Security Owner': 'can resolve findings (a written note is required).',
  'Judge / Guest': 'view-only: can inspect everything, cannot change state or mode.',
};

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => { setHash(window.location.hash || '#/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#/, '') || '/';
}

export default function App() {
  const route = useHashRoute();
  const [role, setRole] = useState<Role>('Approver');
  const [mode, setModeState] = useState<Mode>('advisory');
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, kind, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4500);
  }, []);

  useEffect(() => { api.mode().then((m) => setModeState(m.mode)).catch(() => {}); }, [tick]);

  const changeMode = async (m: Mode) => {
    if (m === mode) return;
    try {
      await api.setMode(m, role);
      setModeState(m);
      toast(m === 'enforced' ? 'success' : 'warn', m === 'enforced'
        ? 'Enforced mode: policy gates are now binding.'
        : 'Advisory mode: findings are informational (legacy baseline).');
      refresh();
    } catch (e) { toast('error', (e as Error).message); }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await api.reset();
      setModeState('advisory');
      toast('info', 'Demo reset — seed data restored, advisory mode.');
      refresh();
    } catch (e) { toast('error', (e as Error).message); }
    setBusy(false);
  };

  const nav = [
    { href: '#/', label: 'Gate dashboard', active: route === '/' || route.startsWith('/changes') },
    { href: '#/policies', label: 'Policies', active: route === '/policies' },
    { href: '#/ledger', label: 'Audit ledger', active: route === '/ledger' },
    { href: '#/legacy', label: 'Legacy view', active: route === '/legacy' },
  ];

  let page: ReactNode;
  const m = route.match(/^\/changes\/([\w-]+)/);
  if (m) page = <ChangeDetailPage id={m[1]} />;
  else if (route === '/policies') page = <Policies />;
  else if (route === '/ledger') page = <LedgerPage />;
  else if (route === '/legacy') page = <Legacy />;
  else if (route === '/' || route === '') page = <Dashboard />;
  else page = <div className="empty">No page at <span className="mono">{route}</span>. <a href="#/">Go to the gate dashboard</a>.</div>;

  return (
    <AppCtx.Provider value={{ role, mode, tick, refresh, toast, setRole }}>
      <div className="demo-strip">
        <span>Demo environment · non-production · no login required</span>
        <span className="perm-help">
          <strong>{role}</strong>{' — '}{ROLE_HELP[role]} <span className="muted">· Role switcher is a demo control, not authentication.</span>
        </span>
        <span className="sim-label">Simulated findings feed</span>
      </div>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            ShipGate
          </a>
          <nav className="nav" aria-label="Main">
            {nav.map((n) => <a key={n.href} href={n.href} className={n.active ? 'active' : ''}>{n.label}</a>)}
          </nav>
          <div className="controls">
            <div className={`mode-toggle ${mode}`} role="group" aria-label="Enforcement mode (demo control)"
              title={role === 'Judge / Guest' ? 'Judge / Guest is view-only — switch role to change the mode' : 'Demo control: advisory = legacy baseline, enforced = binding gates'}>
              <button className={mode === 'advisory' ? 'on' : ''} disabled={role === 'Judge / Guest'} onClick={() => changeMode('advisory')} aria-pressed={mode === 'advisory'}>Advisory</button>
              <button className={mode === 'enforced' ? 'on' : ''} disabled={role === 'Judge / Guest'} onClick={() => changeMode('enforced')} aria-pressed={mode === 'enforced'}>Enforced</button>
            </div>
            <label className="role-select">
              <span className="sr-only">Demo role (not authentication)</span>
              <span className="role-hint" aria-hidden>Acting as</span>
              <select value={role} onChange={(e) => { setRole(e.target.value as Role); toast('info', `Acting as ${e.target.value} (demo control, not authentication).`); }}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <button className="btn ghost small" onClick={reset} disabled={busy} title="Restore seed data and advisory mode">
              {busy ? 'Resetting…' : 'Reset demo'}
            </button>
          </div>
        </div>
      </header>
      <main className="page">{page}</main>
      <footer className="foot">
        ShipGate · policy gates enforced server-side · SHA-256 hash-chained ledger · findings feed simulated for this demo
      </footer>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </AppCtx.Provider>
  );
}
