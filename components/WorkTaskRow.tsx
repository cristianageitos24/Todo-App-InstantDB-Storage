'use client';
import {childTasks, isMeetingTask, meetingProgress, meetingProgressLabel, WorkNote, WorkTask} from '@/lib/workroom';
import {Icon} from './WorkUI';

export default function WorkTaskRow({
  task, tasks, notes, now, today, selected, expanded, nested, fromTitle, when,
  onToggle, onOpen, onExpand, onToday, onNote,
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
}) {
  const meeting = isMeetingTask(task);
  const children = meeting ? childTasks(tasks, task.id) : [];
  const progress = meeting ? meetingProgress(tasks, task.id) : null;
  const done = meeting ? !!progress && progress.total > 0 && progress.done === progress.total : task.done;
  const note = task.noteId ? notes.find(n => n.id === task.noteId) : undefined;
  const percent = progress && progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return (
    <>
      <div className={`work-task-row ${selected === task.id ? 'selected' : ''} ${done ? 'is-done' : ''} ${meeting ? 'is-meeting' : ''} ${nested ? 'is-child' : ''}`}>
        {meeting && (
          <button
            className={`meeting-toggle ${expanded ? 'is-open' : ''}`}
            aria-expanded={!!expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${task.title || 'Untitled meeting'}`}
            onClick={() => onExpand?.(task.id)}
          >
            <Icon name="chevron" size={14}/>
          </button>
        )}
        <button className={`wr-check ${done ? 'checked' : ''}`} aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => onToggle(task)}>{done && <Icon name="check" size={12}/>}</button>
        <button
          className="work-task-body"
          aria-label={meeting ? `${expanded ? 'Collapse' : 'Expand'} ${task.title}` : `Open task ${task.title}`}
          onClick={() => meeting ? onExpand?.(task.id) : onOpen(task.id)}
        >
          <strong>{task.title || (meeting ? 'Untitled meeting' : 'Untitled task')}</strong>
          {meeting && <small className="meeting-count">{meetingProgressLabel(tasks, task.id)}</small>}
          {fromTitle && <small className="meeting-from">from {fromTitle}</small>}
          {meeting && progress && progress.total > 0 && <span className="meeting-bar" aria-hidden="true"><i style={{width: `${percent}%`}}/></span>}
        </button>
        <div className="task-row-end">
          {meeting && note && onNote && (
            <button className="wr-icon meeting-note" aria-label={`Open notes for ${note.title || 'this meeting'}`} onClick={() => onNote(note.id)}>
              <Icon name="note" size={15}/>
            </button>
          )}
          {meeting && (
            <button className="wr-icon meeting-note" aria-label={`Open meeting details ${task.title}`} onClick={() => onOpen(task.id)}>
              <Icon name="list" size={15}/>
            </button>
          )}
          {!meeting && !done && (
            <button className={`today-toggle ${task.today === today ? 'chosen' : ''}`} aria-label={`${task.today === today ? 'Remove from' : 'Plan for'} today: ${task.title}`} aria-pressed={task.today === today} title={task.today === today ? 'Remove from today' : 'Plan for today'} onClick={() => onToday(task)}>
              <Icon name="star" size={16}/>
            </button>
          )}
          {!meeting && task.priority === 'High' && <span className="simple-priority" aria-label="High priority" title="High priority">!</span>}
          <span className={`task-date ${!done && task.dueAt && new Date(task.dueAt).getTime() < now ? 'overdue' : ''}`}>{task.dueAt ? when(task.dueAt, now) : ''}</span>
        </div>
      </div>
      {meeting && expanded && children.map(child => (
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
        />
      ))}
    </>
  );
}
