'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {bundleProgressLabel, canGroupTask, childTasks, isBundleTask, isMeetingTask, meetingProgress, Priority, WorkNote, WorkTask} from '@/lib/workroom';
import {Icon} from './WorkUI';

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

function PriorityFlag({
  title,
  priority,
  onChange,
}: {
  title: string;
  priority: Priority;
  onChange: (priority: Priority) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <div className={`priority-flag is-${priority.toLowerCase()} ${open ? 'is-open' : ''}`} ref={root}>
      <button
        type="button"
        className="priority-flag-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={`Priority: ${priority}`}
        title={`Priority: ${priority}`}
        onClick={() => setOpen(current => !current)}
      >
        <Icon name="flag" size={14}/>
        {priority === 'High' && <span className="priority-flag-mark" aria-hidden="true">!</span>}
      </button>
      {open && (
        <div className="priority-menu" id={`${id}-menu`} role="menu" aria-label={`Set priority for ${title || 'this task'}`}>
          {PRIORITIES.map(level => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={level === priority}
              className={`priority-option is-${level.toLowerCase()} ${level === priority ? 'is-selected' : ''}`}
              key={level}
              onClick={() => {
                onChange(level);
                close();
              }}
            >
              <Icon name="flag" size={13}/>
              {level}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkTaskRow({
  task, tasks, notes, now, today, selected, expanded, nested, fromTitle, when,
  onToggle, onOpen, onExpand, onToday, onNote, onPriority, grouping, picked, onPick,
}: {
  task: WorkTask;
  tasks: WorkTask[];
  notes: WorkNote[];
  now: number;
  today: string;
  selected: string | null;
  expanded?: boolean;
  nested?: boolean;
  fromTitle?: string;
  when: (value: string, now: number) => string;
  onToggle: (task: WorkTask) => void;
  onOpen: (id: string) => void;
  onExpand?: (id: string) => void;
  onToday: (task: WorkTask) => void;
  onNote?: (id: string) => void;
  onPriority: (task: WorkTask, priority: Priority) => void;
  grouping?: boolean;
  picked?: boolean;
  onPick?: (id: string) => void;
}) {
  const bundle = isBundleTask(task);
  const meeting = isMeetingTask(task);
  const children = bundle ? childTasks(tasks, task.id) : [];
  const progress = bundle ? meetingProgress(tasks, task.id) : null;
  const done = bundle ? !!progress && progress.total > 0 && progress.done === progress.total : task.done;
  const note = task.noteId ? notes.find(n => n.id === task.noteId) : undefined;
  const percent = progress && progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  const untitled = meeting ? 'Untitled meeting' : bundle ? 'Untitled group' : 'Untitled task';
  const pickable = !!grouping && canGroupTask(task);
  return (
    <>
      <div className={`work-task-row ${selected === task.id ? 'selected' : ''} ${done ? 'is-done' : ''} ${bundle ? 'is-meeting' : ''} ${nested ? 'is-child' : ''} ${picked ? 'is-picked' : ''}`}>
        {grouping && (
          <button
            type="button"
            className={`wr-check group-pick ${picked ? 'checked' : ''}`}
            disabled={!pickable}
            aria-pressed={!!picked}
            aria-label={pickable ? `${picked ? 'Unselect' : 'Select'} ${task.title || untitled}` : `${task.title || untitled} cannot be grouped`}
            onClick={() => pickable && onPick?.(task.id)}
          >{picked && <Icon name="check" size={12}/>}</button>
        )}
        <PriorityFlag title={task.title} priority={task.priority} onChange={priority => onPriority(task, priority)}/>
        {bundle && (
          <button
            className={`meeting-toggle ${expanded ? 'is-open' : ''}`}
            aria-expanded={!!expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${task.title || untitled}`}
            onClick={() => onExpand?.(task.id)}
          >
            <Icon name="chevron" size={14}/>
          </button>
        )}
        <button className={`wr-check ${done ? 'checked' : ''}`} aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => onToggle(task)}>{done && <Icon name="check" size={12}/>}</button>
        <button
          className="work-task-body"
          aria-label={bundle ? `${expanded ? 'Collapse' : 'Expand'} ${task.title}` : `Open task ${task.title}`}
          onClick={() => bundle ? onExpand?.(task.id) : onOpen(task.id)}
        >
          <strong>{task.title || untitled}</strong>
          {bundle && <small className="meeting-count">{bundleProgressLabel(tasks, task.id, meeting ? 'No action items' : 'No tasks')}</small>}
          {fromTitle && <small className="meeting-from">from {fromTitle}</small>}
          {bundle && progress && progress.total > 0 && <span className="meeting-bar" aria-hidden="true"><i style={{width: `${percent}%`}}/></span>}
        </button>
        <div className="task-row-end">
          {meeting && note && onNote && (
            <button className="wr-icon meeting-note" aria-label={`Open notes for ${note.title || 'this meeting'}`} onClick={() => onNote(note.id)}>
              <Icon name="note" size={15}/>
            </button>
          )}
          {bundle && (
            <button className="wr-icon meeting-note" aria-label={`Open ${meeting ? 'meeting' : 'group'} details ${task.title}`} onClick={() => onOpen(task.id)}>
              <Icon name="list" size={15}/>
            </button>
          )}
          {!bundle && !done && (
            <button className={`today-toggle ${task.today === today ? 'chosen' : ''}`} aria-label={`${task.today === today ? 'Remove from' : 'Plan for'} today: ${task.title}`} aria-pressed={task.today === today} title={task.today === today ? 'Remove from today' : 'Plan for today'} onClick={() => onToday(task)}>
              <Icon name="star" size={16}/>
            </button>
          )}
          <span className={`task-date ${!done && task.dueAt && new Date(task.dueAt).getTime() < now ? 'overdue' : ''}`}>{task.dueAt ? when(task.dueAt, now) : ''}</span>
        </div>
      </div>
      {bundle && expanded && children.map(child => (
        <WorkTaskRow
          key={child.id}
          task={child}
          tasks={tasks}
          notes={notes}
          now={now}
          today={today}
          selected={selected}
          nested
          when={when}
          onToggle={onToggle}
          onOpen={onOpen}
          onToday={onToday}
          onPriority={onPriority}
        />
      ))}
    </>
  );
}
