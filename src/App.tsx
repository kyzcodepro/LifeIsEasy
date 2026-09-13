import { useEffect, useMemo, useState } from 'react';
import { MobileNav, Sidebar } from './components/layout/Sidebar';
import { ROUTES, ROUTE_IDS } from './components/layout/Nav';
import { Icon } from './components/ui/Icon';
import { Modal } from './components/ui/Modal';
import { TransactionModal } from './components/forms/TransactionModal';
import { EventModal } from './components/forms/EventModal';
import { TaskModal } from './components/forms/TaskModal';
import { QuickCapture } from './components/forms/QuickCapture';
import { useStore } from './store/store';
import { taskStats } from './store/selectors';
import { addMonths, monthKey, monthLabel, startOfMonth, today } from './lib/date';

import { Dashboard } from './pages/Dashboard';
import { AssistantPage } from './pages/Assistant';
import { CalendarPage } from './pages/Calendar';
import { TasksPage } from './pages/Tasks';
import { FinancePage } from './pages/Finance';
import { BusinessPage } from './pages/Business';
import { RecurringPage } from './pages/Recurring';
import { LeisurePage } from './pages/Leisure';
import { HabitsPage } from './pages/Habits';
import { GoalsPage } from './pages/Goals';
import { StatsPage } from './pages/Stats';
import { SettingsPage } from './pages/Settings';

const MONTH_PAGES = new Set(['finance', 'business', 'leisure', 'stats', 'recurring']);

const SUBTITLES: Record<string, string> = {
  dashboard: 'Votre vie en un coup d’œil',
  assistant: 'Dites-le en une phrase, je le range au bon endroit',
  calendar: 'Planifiez votre semaine, heure par heure',
  tasks: 'Tout ce qu’il y a à faire, par domaine',
  finance: 'Dépenses, revenus, comptes et budgets',
  business: 'Chiffre d’affaires, marge et objectifs',
  recurring: 'Charges fixes, abonnements et budgets mensuels',
  leisure: 'Temps et argent consacrés à ce qui fait plaisir',
  habits: 'Régularité, séries et progression',
  goals: 'Là où vous voulez aller, et où vous en êtes',
  stats: 'Toutes vos données croisées',
  settings: 'Comptes, catégories, sauvegarde et thème',
};

function useHashRoute(): [string, (id: string) => void] {
  const read = () => {
    const id = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return ROUTE_IDS.includes(id) ? id : 'dashboard';
  };
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: string) => {
    window.location.hash = `/${id}`;
    setRoute(id);
    window.scrollTo({ top: 0 });
  };
  return [route, go];
}

export default function App() {
  const { state, setSettings } = useStore();
  const [route, go] = useHashRoute();
  const [month, setMonth] = useState(monthKey(today()));
  const [quick, setQuick] = useState<null | 'menu' | 'tx' | 'event' | 'task' | 'capture'>(null);

  // Thème : clair / sombre / système
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  const badges = useMemo(() => {
    const t = taskStats(state);
    return { tasks: t.open || undefined } as Record<string, number | undefined>;
  }, [state]);

  const currentRoute = ROUTES.find((r) => r.id === route) ?? ROUTES[0];
  const showMonth = MONTH_PAGES.has(route);
  const isCurrentMonth = month === monthKey(today());

  const shiftMonth = (delta: number) => setMonth(monthKey(addMonths(startOfMonth(`${month}-01`), delta)));

  const nextTheme = () => {
    const order = ['system', 'light', 'dark'] as const;
    const idx = order.indexOf(state.settings.theme);
    setSettings({ theme: order[(idx + 1) % order.length] });
  };

  const page = () => {
    switch (route) {
      case 'assistant':
        return <AssistantPage onNavigate={go} />;
      case 'calendar':
        return <CalendarPage />;
      case 'tasks':
        return <TasksPage />;
      case 'finance':
        return <FinancePage month={month} />;
      case 'business':
        return <BusinessPage month={month} />;
      case 'recurring':
        return <RecurringPage month={month} />;
      case 'leisure':
        return <LeisurePage month={month} />;
      case 'habits':
        return <HabitsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'stats':
        return <StatsPage month={month} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={go} />;
    }
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>Aller au contenu</a>
      <Sidebar current={route} onNavigate={go} badges={badges} />

      <div className="main">
        <header className="topbar">
          <div className="topbar-titles">
            <h1>{currentRoute.label}</h1>
            <div className="subtitle">{SUBTITLES[route]}</div>
          </div>

          <div className="topbar-actions">
            {showMonth && (
              <div className="flex" style={{ gap: 4 }}>
                <button className="btn btn-ghost btn-icon" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
                  <Icon name="chevronLeft" size={16} />
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setMonth(monthKey(today()))}
                  title="Revenir au mois en cours"
                  style={{ minWidth: 132, justifyContent: 'center' }}
                >
                  {monthLabel(month)}
                </button>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => shiftMonth(1)}
                  aria-label="Mois suivant"
                  disabled={isCurrentMonth}
                  style={isCurrentMonth ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            )}

            <button className="btn btn-ghost btn-icon" onClick={nextTheme} aria-label="Changer de thème" title={`Thème : ${state.settings.theme}`}>
              <Icon name={state.settings.theme === 'dark' ? 'moon' : 'sun'} size={17} />
            </button>

            <button className="btn btn-primary" onClick={() => setQuick('menu')}>
              <Icon name="plus" size={15} />
              Ajouter
            </button>
          </div>
        </header>

        <main key={route} id="main-content" tabIndex={-1} className="page">{page()}</main>
      </div>

      <MobileNav current={route} onNavigate={go} />

      <button className="btn btn-primary fab" onClick={() => setQuick('capture')}>
        <Icon name="plus" size={16} />
        Ajouter
      </button>

      {quick === 'menu' && (
        <Modal title="Que voulez-vous ajouter ?" onClose={() => setQuick(null)}>
          <div className="grid grid-3" style={{ gap: 10 }}>
            <button type="button" className="btn" style={{ flexDirection: 'column', padding: 18 }} onClick={() => setQuick('tx')}>
              <Icon name="wallet" size={20} />
              Opération
            </button>
            <button type="button" className="btn" style={{ flexDirection: 'column', padding: 18 }} onClick={() => setQuick('event')}>
              <Icon name="calendar" size={20} />
              Événement
            </button>
            <button type="button" className="btn" style={{ flexDirection: 'column', padding: 18 }} onClick={() => setQuick('task')}>
              <Icon name="check" size={20} />
              Tâche
            </button>
          </div>
          <p className="small muted">
            Astuce : chaque élément peut être rattaché à un business ou à un domaine de vie — c’est ce qui alimente le
            tracking des statistiques.
          </p>
        </Modal>
      )}
      {quick === 'tx' && <TransactionModal onClose={() => setQuick(null)} />}
      {quick === 'event' && <EventModal onClose={() => setQuick(null)} />}
      {quick === 'task' && <TaskModal onClose={() => setQuick(null)} />}
      {quick === 'capture' && <QuickCapture onClose={() => setQuick(null)} />}
    </div>
  );
}
