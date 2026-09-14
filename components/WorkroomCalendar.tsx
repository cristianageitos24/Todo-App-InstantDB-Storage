'use client';
import {useRef,useState} from 'react';
import {calendarChipLabel,calendarDay,dueTimeLabel,monthGrid,overdueOnCalendar,shiftCalendarDay,tasksOnDay,unscheduledCount,WorkNote,WorkTask} from '@/lib/workroom';
import {Icon} from './WorkUI';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WorkroomCalendar({
  tasks, notes, now, selectedDay, onSelectDay, onOpenTask, onOpenNote, onAddForDay, onInbox,
}: {
  tasks: WorkTask[];
  notes: WorkNote[];
  now: number;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onOpenTask: (id: string) => void;
  onOpenNote: (id: string) => void;
  onAddForDay: (day: string) => void;
  onInbox: () => void;
}) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const agendaRef = useRef<HTMLElement>(null);
  const nowDate = new Date(now);
  const localToday = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
  const year = Number(selectedDay.slice(0, 4));
  const month = Number(selectedDay.slice(5, 7)) - 1;
  const cells = monthGrid(year, month);
  const overdue = overdueOnCalendar(tasks, now);
  const dayTasks = tasksOnDay(tasks, selectedDay, hideCompleted);
  const unscheduled = unscheduledCount(tasks);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
  const selectedLabel = new Date(`${selectedDay}T12:00`).toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  const noteFor = (task: WorkTask) => notes.find(n => n.id === task.noteId);
  const selectDay = (day: string) => {
    onSelectDay(day);
    requestAnimationFrame(() => agendaRef.current?.focus());
  };

  return (
    <div className="workroom-calendar">
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
          <button className="wr-icon cal-prev" aria-label="Previous month" onClick={() => onSelectDay(shiftCalendarDay(selectedDay, -1))}><Icon name="chevron" size={16}/></button>
          <h2>{monthLabel}</h2>
          <button className="wr-icon cal-next" aria-label="Next month" onClick={() => onSelectDay(shiftCalendarDay(selectedDay, 1))}><Icon name="chevron" size={16}/></button>
          <button className="wr-text" onClick={() => selectDay(localToday)}>Today</button>
        </div>
        <label className="cal-hide">
          <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)}/>
          Hide completed
        </label>
      </div>
      <div className="cal-grid" role="grid" aria-label={`${monthLabel} calendar`}>
        {WEEKDAYS.map(day => <div className="cal-weekday" role="columnheader" key={day}>{day}</div>)}
        {cells.map((day, index) => {
          if (!day) return <div className="cal-cell empty" role="gridcell" key={`pad-${index}`}/>;
          const items = tasksOnDay(tasks, day, hideCompleted);
          const preview = items.slice(0, 3);
          const extra = items.length - preview.length;
          const isToday = day === localToday;
          const isSelected = day === selectedDay;
          const hasOverdue = items.some(t => !t.done && new Date(t.dueAt).getTime() < now);
          return (
            <div
              className={`cal-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasOverdue ? 'has-overdue' : ''}`}
              role="gridcell"
              key={day}
            >
              <button
                className="cal-date"
                aria-label={new Date(`${day}T12:00`).toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}
                aria-current={isToday ? 'date' : undefined}
                aria-selected={isSelected}
                onClick={() => selectDay(day)}
              >
                {Number(day.slice(8, 10))}
              </button>
              <div className="cal-chips">
                {preview.map(task => {
                  const note = noteFor(task);
                  return (
                    <button
                      key={task.id}
                      className={`cal-chip ${task.done ? 'is-done' : ''} ${task.priority === 'High' ? 'is-high' : ''}`}
                      aria-label={calendarChipLabel(task, note?.title)}
                      onClick={() => onOpenTask(task.id)}
                    >
                      <span className="cal-chip-title">{task.title || 'Untitled task'}</span>
                      <span className="cal-dot" aria-hidden="true"/>
                      {note && <span className="cal-note-mark" aria-hidden="true"/>}
                    </button>
                  );
                })}
                {extra > 0 && <span className="cal-more">+{extra}</span>}
              </div>
              {items.length === 0 && (
                <button className="cal-add-empty" aria-label={`Add a task due ${day}`} onClick={() => { selectDay(day); onAddForDay(day); }}>+</button>
              )}
            </div>
          );
        })}
      </div>
      <section className="cal-agenda" ref={agendaRef} tabIndex={-1} aria-label={`Due ${selectedLabel}`}>
        <div className="cal-agenda-head">
          <h3>{selectedLabel}</h3>
          <span>{dayTasks.length} due</span>
        </div>
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
                <span className={`task-date ${overdueTask ? 'overdue' : ''}`}>{dueTimeLabel(task.dueAt) || 'Due'}{task.priority === 'High' ? ' · High' : ''}</span>
              </button>
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
      {unscheduled > 0 && (
        <p className="cal-unscheduled">
          {unscheduled} {unscheduled === 1 ? 'task has' : 'tasks have'} no due date.{' '}
          <button className="wr-text" onClick={onInbox}>Review in Inbox</button>
        </p>
      )}
    </div>
  );
}
