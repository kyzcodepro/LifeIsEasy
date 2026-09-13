import { useMemo, useState } from 'react';
import { Card, StatTile } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { EventModal } from '../components/forms/EventModal';
import { useStore } from '../store/store';
import { eventsOn, plannedMinutesByDomain } from '../store/selectors';
import {
  addDays, addMonths, DAY_SHORT, formatDuration, fromISO, isoWeekDays, MONTH_NAMES,
  minutesBetween, minutesToTime, startOfMonth, startOfWeek, timeToMinutes, today, toISO,
} from '../lib/date';
import { DOMAIN_META, domainColor } from '../lib/domains';
import type { CalendarEvent, Domain } from '../types';

const HOUR_START = 6;
const HOUR_END = 24;
const SLOT_H = 44;

export function CalendarPage() {
  const { state, update } = useStore();
  const now = today();
  const [view, setView] = useState<'semaine' | 'mois'>('semaine');
  const [anchor, setAnchor] = useState(now);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [creating, setCreating] = useState<{ date: string; start: string } | null>(null);

  const weekStart = startOfWeek(anchor);
  const days = isoWeekDays(weekStart);
  const weekEnd = days[6];

  const planned = useMemo(
    () => plannedMinutesByDomain(state, weekStart, weekEnd),
    [state, weekStart, weekEnd],
  );
  const totalPlanned = Object.values(planned).reduce((s, v) => s + v, 0);
  const domainsRanked = (Object.entries(planned) as Array<[Domain, number]>).sort((a, b) => b[1] - a[1]);

  const shift = (delta: number) =>
    setAnchor(view === 'semaine' ? addDays(anchor, delta * 7) : addMonths(anchor, delta));

  const title =
    view === 'semaine'
      ? `Semaine du ${fromISO(weekStart).getDate()} ${MONTH_NAMES[fromISO(weekStart).getMonth()].toLowerCase()}`
      : `${MONTH_NAMES[fromISO(anchor).getMonth()]} ${fromISO(anchor).getFullYear()}`;

  const toggleDone = (ev: CalendarEvent, date: string) => {
    const doneDates = ev.doneDates ?? [];
    update('events', ev.id, {
      doneDates: doneDates.includes(date) ? doneDates.filter((d) => d !== date) : [...doneDates, date],
    });
  };

  return (
    <>
      <div className="flex flex-wrap">
        <div className="segmented">
          <button aria-pressed={view === 'semaine'} onClick={() => setView('semaine')}>
            Semaine
          </button>
          <button aria-pressed={view === 'mois'} onClick={() => setView('mois')}>
            Mois
          </button>
        </div>
        <div className="spacer" />
        <div className="flex" style={{ gap: 4 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => shift(-1)} aria-label="Précédent">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn btn-sm" onClick={() => setAnchor(now)} style={{ minWidth: 160, justifyContent: 'center' }}>
            {title}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => shift(1)} aria-label="Suivant">
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating({ date: anchor, start: '09:00' })}>
          <Icon name="plus" size={14} />
          Événement
        </button>
      </div>

      {view === 'semaine' && (
        <div className="grid grid-kpi">
          <StatTile label="Temps planifié" value={formatDuration(totalPlanned)} foot="sur la semaine" small />
          <StatTile
            label="Événements"
            value={String(days.reduce((s, d) => s + eventsOn(state, d).length, 0))}
            foot="du lundi au dimanche"
            small
          />
          <StatTile
            label="Domaine dominant"
            value={domainsRanked[0] ? DOMAIN_META[domainsRanked[0][0]].label : '—'}
            foot={domainsRanked[0] ? formatDuration(domainsRanked[0][1]) : 'Aucun événement'}
            small
          />
          <StatTile
            label="Temps libre estimé"
            value={formatDuration(Math.max(0, 7 * (HOUR_END - HOUR_START) * 60 - totalPlanned))}
            foot={`sur ${HOUR_START}h–${HOUR_END}h`}
            small
          />
        </div>
      )}

      {view === 'semaine' ? (
        <Card>
          <div className="cal-scroll">
            <div className="cal-grid" style={{ gridTemplateRows: 'auto 1fr' }}>
              <div className="cal-corner" />
              {days.map((d) => (
                <div key={d} className={`cal-head${d === now ? ' today' : ''}`}>
                  {DAY_SHORT[(fromISO(d).getDay() + 6) % 7]}
                  <span className="dnum">{fromISO(d).getDate()}</span>
                </div>
              ))}

              <div>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} className="cal-hour">
                    {String(HOUR_START + i).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {days.map((day) => (
                <DayColumn
                  key={day}
                  date={day}
                  events={eventsOn(state, day)}
                  onCreate={(start) => setCreating({ date: day, start })}
                  onOpen={setEditing}
                  onToggleDone={toggleDone}
                />
              ))}
            </div>
          </div>
          <div className="chart-legend">
            {(Object.keys(DOMAIN_META) as Domain[]).map((d) => (
              <span className="item" key={d}>
                <span className="swatch" style={{ background: domainColor(d) }} />
                {DOMAIN_META[d].label}
              </span>
            ))}
          </div>
        </Card>
      ) : (
        <MonthView state={state} anchor={anchor} onPick={(d) => setCreating({ date: d, start: '09:00' })} onOpen={setEditing} />
      )}

      {view === 'semaine' && (
        <Card title="Répartition du temps planifié" subtitle="Semaine en cours, par domaine de vie">
          <div className="stack" style={{ gap: 10 }}>
            {domainsRanked.length ? (
              domainsRanked.map(([d, mins]) => (
                <div key={d}>
                  <div className="flex small" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 550 }}>{DOMAIN_META[d].label}</span>
                    <div className="spacer" />
                    <span className="tnum">
                      {formatDuration(mins)} <span className="muted">· {((mins / totalPlanned) * 100).toFixed(0)} %</span>
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${(mins / totalPlanned) * 100}%`, background: domainColor(d) }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="muted small">Aucun événement planifié cette semaine.</p>
            )}
          </div>
        </Card>
      )}

      {editing && <EventModal initial={editing} onClose={() => setEditing(null)} />}
      {creating && <EventModal defaultDate={creating.date} defaultStart={creating.start} onClose={() => setCreating(null)} />}
    </>
  );
}

function DayColumn({
  date,
  events,
  onCreate,
  onOpen,
  onToggleDone,
}: {
  date: string;
  events: CalendarEvent[];
  onCreate: (start: string) => void;
  onOpen: (e: CalendarEvent) => void;
  onToggleDone: (e: CalendarEvent, date: string) => void;
}) {
  const height = (HOUR_END - HOUR_START) * SLOT_H;

  // Placement côte à côte des événements qui se chevauchent
  const positioned = events.map((ev, i) => {
    const s = timeToMinutes(ev.start);
    const e = timeToMinutes(ev.end);
    const overlaps = events.filter((o, j) => j !== i && timeToMinutes(o.start) < e && timeToMinutes(o.end) > s);
    const before = overlaps.filter((o) => events.indexOf(o) < i).length;
    const cols = overlaps.length + 1;
    return { ev, s, e, col: before, cols };
  });

  return (
    <div
      className="cal-col"
      style={{
        height,
        background:
          'repeating-linear-gradient(var(--surface) 0 43px, var(--grid) 43px 44px)',
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const y = e.nativeEvent.offsetY;
        const mins = Math.round(((y / SLOT_H) * 60) / 30) * 30 + HOUR_START * 60;
        onCreate(minutesToTime(Math.min(mins, (HOUR_END - 1) * 60)));
      }}
    >
      {positioned.map(({ ev, s, e, col, cols }) => {
        const top = ((s - HOUR_START * 60) / 60) * SLOT_H;
        const h = Math.max(20, ((e - s) / 60) * SLOT_H - 2);
        const done = (ev.doneDates ?? []).includes(date);
        const width = 100 / cols;
        return (
          <div
            key={ev.id}
            className={`cal-event${done ? ' done' : ''}`}
            style={{
              top: Math.max(0, top),
              height: h,
              left: `calc(${col * width}% + 2px)`,
              width: `calc(${width}% - 4px)`,
              color: domainColor(ev.domain),
              background: `color-mix(in srgb, ${domainColor(ev.domain)} 14%, var(--surface))`,
            }}
            onClick={(evt) => {
              evt.stopPropagation();
              onOpen(ev);
            }}
            onDoubleClick={(evt) => {
              evt.stopPropagation();
              onToggleDone(ev, date);
            }}
            title={`${ev.title} · ${ev.start}–${ev.end} — double-clic pour marquer comme fait`}
          >
            <div className="ttl">{ev.title}</div>
            {h > 32 && (
              <div className="hr">
                {ev.start} – {ev.end} · {formatDuration(minutesBetween(ev.start, ev.end))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  state,
  anchor,
  onPick,
  onOpen,
}: {
  state: ReturnType<typeof useStore>['state'];
  anchor: string;
  onPick: (d: string) => void;
  onOpen: (e: CalendarEvent) => void;
}) {
  const now = today();
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const monthIdx = fromISO(first).getMonth();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <Card>
      <div className="month-grid" style={{ marginBottom: 6 }}>
        {DAY_SHORT.map((d) => (
          <div key={d} className="small muted" style={{ textAlign: 'center', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>
      <div className="month-grid">
        {cells.map((d) => {
          const evs = eventsOn(state, d);
          const out = fromISO(d).getMonth() !== monthIdx;
          return (
            <div
              key={d}
              className={`month-cell${out ? ' out' : ''}${d === now ? ' today' : ''}`}
              onClick={() => onPick(d)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onPick(d)}
            >
              <span className="dnum">{fromISO(d).getDate()}</span>
              {evs.slice(0, 3).map((ev) => (
                <span
                  key={ev.id}
                  className="mini-ev"
                  style={{ color: domainColor(ev.domain) }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(ev);
                  }}
                >
                  {ev.start} {ev.title}
                </span>
              ))}
              {evs.length > 3 && <span className="small muted">+{evs.length - 3}</span>}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Astuce : cliquez sur un jour pour y ajouter un événement. Dans la vue semaine, un double-clic sur un événement le
        marque comme fait (suivi du temps réellement tenu).
      </p>
      <span hidden>{toISO(new Date())}</span>
    </Card>
  );
}
