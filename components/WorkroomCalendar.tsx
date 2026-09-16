'use client';
import {useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import {
  addCalendarDays,calendarChipLabel,calendarDay,dayLoad,dueTimeLabel,formatMinutes,ghostsOnDay,
  isRepeatFreq,monthGrid,notesOnDay,overdueOnCalendar,projectAccent,shiftCalendarDay,shiftCalendarWeek,
  tasksOnDay,unscheduledTasks,weekDays,weekRangeLabel,WorkNote,WorkTask,
} from '@/lib/workroom';
import {Icon} from './WorkUI';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dayName(day: string, style: 'long' | 'short' = 'long'): string {
  return new Date(`${day}T12:00`).toLocaleDateString('en-US', style === 'long'
    ? {weekday: 'long', month: 'long', day: 'numeric'}
    : {weekday: 'short', month: 'short', day: 'numeric'});
}

export default function WorkroomCalendar({
  tasks, notes, projects, now, selectedDay, onSelectDay, onOpenTask, onOpenNote, onAddForDay, onInbox, onReschedule, onSkip,
}: {
  tasks: WorkTask[];
  notes: WorkNote[];
  projects: string[];
  now: number;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onOpenTask: (id: string) => void;
  onOpenNote: (id: string) => void;
  onAddForDay: (day: string) => void;
  onInbox: () => void;
  onReschedule: (id: string, day: string) => void;
  onSkip: (id: string) => void;
}) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [range, setRange] = useState<'month' | 'week'>('month');
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const drag = useRef<{id: string; x: number; y: number; dragging: boolean} | null>(null);
  const agendaRef = useRef<HTMLElement>(null);
  const localToday = localDay(now);
  const year = Number(selectedDay.slice(0, 4));
  const month = Number(selectedDay.slice(5, 7)) - 1;
  const visible = projectFilter.length ? tasks.filter(t => projectFilter.includes(t.project)) : tasks;
  const cells = monthGrid(year, month);
  const week = weekDays(selectedDay);
  const overdue = overdueOnCalendar(visible, now);
  const dayTasks = tasksOnDay(visible, selectedDay, hideCompleted);
  const dayNotes = notesOnDay(notes, selectedDay);
  const inbox = unscheduledTasks(visible);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
  const heading = range === 'week' ? weekRangeLabel(selectedDay) : monthLabel;
  const selectedLabel = dayName(selectedDay);
  const noteFor = (task: WorkTask) => notes.find(n => n.id === task.noteId);
  const selectDay = (day: string) => {
    onSelectDay(day);
    requestAnimationFrame(() => agendaRef.current?.focus());
  };
  const toggleProject = (name: string) => {
    setProjectFilter(current => current.includes(name) ? current.filter(p => p !== name) : [...current, name]);
  };
  const dayFromPoint = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('[data-cal-day]')?.getAttribute('data-cal-day') || null;
  const bindDrag = (id: string, open = true) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = {id, x: e.clientX, y: e.clientY, dragging: false};
    },
    onPointerMove: (e: PointerEvent) => {
      if (!drag.current || drag.current.id !== id) return;
      if (!drag.current.dragging && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > 6) {
        drag.current.dragging = true;
        setDragId(id);
      }
      if (drag.current.dragging) setDropDay(dayFromPoint(e.clientX, e.clientY));
    },
    onPointerUp: (e: PointerEvent) => {
      if (!drag.current || drag.current.id !== id) return;
      const moved = drag.current.dragging;
      const day = dayFromPoint(e.clientX, e.clientY);
      drag.current = null;
      setDragId(null);
      setDropDay(null);
      if (moved) { if (day) onReschedule(id, day); }
      else if (open) onOpenTask(id);
    },
  });
  const chipStyle = (task: WorkTask): CSSProperties | undefined => {
    const accent = projectAccent(task.project);
    return accent ? {borderLeft: `3px solid ${accent}`} : undefined;
  };

  const renderChip = (task: WorkTask, ghost = false, draggable = false) => {
    const note = noteFor(task);
    return (
      <button
        key={`${ghost ? 'ghost-' : ''}${task.id}`}
        className={`cal-chip ${task.done ? 'is-done' : ''} ${task.priority === 'High' ? 'is-high' : ''} ${ghost ? 'is-ghost' : ''} ${dragId === task.id ? 'is-dragging' : ''}`}
        style={chipStyle(task)}
        aria-label={ghost ? `Next: ${task.title || 'Untitled task'}` : calendarChipLabel(task, note?.title)}
        {...(ghost || !draggable ? {onClick: () => onOpenTask(task.id)} : bindDrag(task.id))}
      >
        <span className="cal-chip-title">{task.title || 'Untitled task'}</span>
        <span className="cal-dot" aria-hidden="true"/>
        {!ghost && note && <span className="cal-note-mark" aria-hidden="true"/>}
      </button>
    );
  };

  const renderDayTasks = (day: string, limit?: number, draggable = false) => {
    const items = tasksOnDay(visible, day, hideCompleted);
    const ghosts = ghostsOnDay(visible, day);
    const preview = limit ? items.slice(0, limit) : items;
    const extra = items.length - preview.length;
    const leftover = limit ? Math.max(0, limit - preview.length) : ghosts.length;
    const ghostPreview = ghosts.slice(0, leftover);
    return (
      <>
        {preview.map(task => renderChip(task, false, draggable))}
        {ghostPreview.map(task => renderChip(task, true))}
        {extra > 0 && <span className="cal-more">+{extra}</span>}
      </>
    );
  };

  return (
    <div className={`workroom-calendar ${dragId ? 'is-dragging' : ''}`}>
      {overdue.length > 0 && (
        <div className="cal-overdue" role="status">
          <span>{overdue.length} overdue</span>
          <button className="wr-text" onClick={() => selectDay(calendarDay(overdue[0].dueAt))}>
            Oldest: {overdue[0].title || 'Untitled task'}
          </button>
        </div>
      )}
      <div className="cal-chrome">
        <div className="cal-month-nav">
          <button className="wr-icon cal-prev" aria-label={range === 'week' ? 'Previous week' : 'Previous month'} onClick={() => onSelectDay(range === 'week' ? shiftCalendarWeek(selectedDay, -1) : shiftCalendarDay(selectedDay, -1))}><Icon name="chevron" size={16}/></button>
          <h2>{heading}</h2>
          <button className="wr-icon cal-next" aria-label={range === 'week' ? 'Next week' : 'Next month'} onClick={() => onSelectDay(range === 'week' ? shiftCalendarWeek(selectedDay, 1) : shiftCalendarDay(selectedDay, 1))}><Icon name="chevron" size={16}/></button>
          <button className="wr-text" onClick={() => selectDay(localToday)}>Today</button>
        </div>
        <div className="cal-chrome-end">
          <div className="cal-range" role="tablist" aria-label="Calendar range">
            <button type="button" role="tab" aria-selected={range === 'month'} onClick={() => setRange('month')}>Month</button>
            <button type="button" role="tab" aria-selected={range === 'week'} onClick={() => setRange('week')}>Week</button>
          </div>
          <label className="cal-hide">
            <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)}/>
            Hide completed
          </label>
        </div>
      </div>
      {projects.length > 1 && (
        <div className="cal-projects" aria-label="Filter by project">
          <button type="button" className={!projectFilter.length ? 'is-on' : ''} aria-pressed={!projectFilter.length} onClick={() => setProjectFilter([])}>All</button>
          {projects.map(name => {
            const accent = projectAccent(name);
            return (
              <button
                type="button"
                key={name}
                className={projectFilter.includes(name) ? 'is-on' : ''}
                aria-pressed={projectFilter.includes(name)}
                style={accent ? {borderLeft: `3px solid ${accent}`} : undefined}
                onClick={() => toggleProject(name)}
              >{name}</button>
            );
          })}
        </div>
      )}
      {range === 'month' ? (
        <div className="cal-grid" role="grid" aria-label={`${monthLabel} calendar`}>
          {WEEKDAYS.map(day => <div className="cal-weekday" role="columnheader" key={day}>{day}</div>)}
          {cells.map((day, index) => {
            if (!day) return <div className="cal-cell empty" role="gridcell" key={`pad-${index}`}/>;
            const items = tasksOnDay(visible, day, hideCompleted);
            const isToday = day === localToday;
            const isSelected = day === selectedDay;
            const hasOverdue = items.some(t => !t.done && new Date(t.dueAt).getTime() < now);
            const noteCount = notesOnDay(notes, day).length;
            return (
              <div
                className={`cal-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasOverdue ? 'has-overdue' : ''} ${dropDay === day ? 'is-drop' : ''}`}
                role="gridcell"
                key={day}
                data-cal-day={day}
              >
                <button
                  className="cal-date"
                  aria-label={dayName(day)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-selected={isSelected}
                  onClick={() => selectDay(day)}
                >
                  {Number(day.slice(8, 10))}
                </button>
                <div className="cal-chips">{renderDayTasks(day, 3)}</div>
                {noteCount > 0 && <span className="cal-note-count" aria-label={`${noteCount} notes from this day`}>{noteCount}</span>}
                {items.length === 0 && (
                  <button className="cal-add-empty" aria-label={`Add a task due ${day}`} onClick={() => { selectDay(day); onAddForDay(day); }}>+</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal-week" aria-label={`${heading} week`}>
          {week.map((day, index) => {
            const items = tasksOnDay(visible, day, hideCompleted);
            const load = formatMinutes(dayLoad(visible, day));
            const isToday = day === localToday;
            const isSelected = day === selectedDay;
            const hasOverdue = items.some(t => !t.done && new Date(t.dueAt).getTime() < now);
            const noteCount = notesOnDay(notes, day).length;
            return (
              <section
                className={`cal-week-col ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasOverdue ? 'has-overdue' : ''} ${dropDay === day ? 'is-drop' : ''}`}
                key={day}
                data-cal-day={day}
                aria-label={dayName(day)}
                onClick={() => selectDay(day)}
              >
                <header className="cal-week-head">
                  <strong>{WEEKDAYS[index]}</strong>
                  <span aria-current={isToday ? 'date' : undefined}>{Number(day.slice(8, 10))}</span>
                  {load && <small>{load}</small>}
                </header>
                <div className="cal-chips">{renderDayTasks(day, undefined, true)}</div>
                {noteCount > 0 && <span className="cal-note-count">{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>}
                <button className="cal-add-empty" aria-label={`Add a task due ${day}`} onClick={e => { e.stopPropagation(); selectDay(day); onAddForDay(day); }}>+</button>
              </section>
            );
          })}
        </div>
      )}
      {range === 'month' && (
        <section className="cal-agenda" ref={agendaRef} tabIndex={-1} aria-label={`Due ${selectedLabel}`}>
          <div className="cal-agenda-head">
            <h3>{selectedLabel}</h3>
            <span>{dayTasks.length} due</span>
          </div>
          {dayNotes.length > 0 && (
            <div className="cal-day-notes">
              <h4>Notes from this day</h4>
              {dayNotes.map(note => (
                <button className="cal-note-chip" key={note.id} aria-label={`Open note ${note.title || 'Untitled note'}`} onClick={() => onOpenNote(note.id)}>
                  <Icon name="note" size={13}/>
                  {note.title || 'Untitled note'}
                </button>
              ))}
            </div>
          )}
          {dayTasks.length === 0 ? (
            <div className="wr-empty small">
              <Icon name="calendar" size={25}/>
              <h3>Nothing due.</h3>
              <p>Add a task for this day.</p>
              <button className="wr-secondary" onClick={() => onAddForDay(selectedDay)}>Add a task for this day</button>
            </div>
          ) : dayTasks.map(task => {
            const note = noteFor(task);
            const overdueTask = !task.done && new Date(task.dueAt).getTime() < now;
            return (
              <div className={`cal-agenda-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                <button className="cal-agenda-task" aria-label={calendarChipLabel(task, note?.title)} onClick={() => onOpenTask(task.id)}>
                  <strong>{task.title || 'Untitled task'}</strong>
                  <span className={`task-date ${overdueTask ? 'overdue' : ''}`}>{dueTimeLabel(task.dueAt) || 'Due'}{task.priority === 'High' ? ' · High' : ''}{task.project !== 'General' ? ` · ${task.project}` : ''}</span>
                </button>
                {!task.done && (
                  <div className="cal-nudges">
                    <button type="button" className="wr-text" onClick={() => onReschedule(task.id, addCalendarDays(selectedDay, -1))}>Yesterday</button>
                    <button type="button" className="wr-text" onClick={() => onReschedule(task.id, addCalendarDays(selectedDay, 1))}>Tomorrow</button>
                    {isRepeatFreq(task.repeat) && <button type="button" className="wr-text" onClick={() => onSkip(task.id)}>Skip this time</button>}
                  </div>
                )}
                {note && (
                  <button className="cal-note-chip" aria-label={`Open linked note ${note.title || 'Untitled note'}`} onClick={() => onOpenNote(note.id)}>
                    <Icon name="note" size={13}/>
                    {note.title || 'Untitled note'}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
      {range === 'week' && dayNotes.length > 0 && (
        <div className="cal-day-notes cal-week-notes">
          <h4>Notes from {selectedLabel}</h4>
          {dayNotes.map(note => (
            <button className="cal-note-chip" key={note.id} aria-label={`Open note ${note.title || 'Untitled note'}`} onClick={() => onOpenNote(note.id)}>
              <Icon name="note" size={13}/>
              {note.title || 'Untitled note'}
            </button>
          ))}
        </div>
      )}
      {inbox.length > 0 && (
        <section className="cal-inbox" aria-label="Tasks with no due date">
          <div className="cal-agenda-head">
            <h3>Needs a date</h3>
            <span>{inbox.length}</span>
          </div>
          <p>Drop onto a day, or schedule on {dayName(selectedDay, 'short')}.</p>
          {inbox.map(task => (
            <div className={`cal-inbox-row ${dragId === task.id ? 'is-dragging' : ''}`} key={task.id} {...bindDrag(task.id, false)}>
              <button type="button" className="cal-inbox-title" onClick={() => onOpenTask(task.id)}>{task.title || 'Untitled task'}</button>
              <button type="button" className="wr-text" onClick={() => onReschedule(task.id, selectedDay)}>Due {dayName(selectedDay, 'short')}</button>
            </div>
          ))}
          <button className="wr-text" onClick={onInbox}>Review all with no date</button>
        </section>
      )}
    </div>
  );
}
