'use client';
import {useState} from 'react';
import {applyDueChange, bundleProgressLabel, calendarDay, descendantIds, isBundleTask, isGroupTask, isMeetingTask, isRepeatFreq, localDateTime, Priority, remindAtFromDue, REPEAT_OPTIONS, rescheduleToDay, skipRepeat, toggleStep, WorkNote, WorkTask} from '@/lib/workroom';
import {Icon} from './WorkUI';
import ProjectPicker from './ProjectPicker';

function ReminderPresets({dueAt, remindAt, onRemind, onMissingDue}: {dueAt: string; remindAt: string; onRemind: (value: string) => void; onMissingDue?: () => void}) {
  const setBefore = (minutes: number) => {
    if (!dueAt) {
      onMissingDue?.();
      return;
    }
    onRemind(remindAtFromDue(dueAt, minutes));
  };
  return (
    <div className="due-presets">
      <button type="button" className="wr-text" disabled={!dueAt} onClick={() => setBefore(0)}>At due time</button>
      <button type="button" className="wr-text" disabled={!dueAt} onClick={() => setBefore(15)}>15 min before</button>
      <button type="button" className="wr-text" disabled={!dueAt} onClick={() => setBefore(30)}>30 min before</button>
      {remindAt && <button type="button" className="wr-text" onClick={() => onRemind('')}>Clear reminder</button>}
    </div>
  );
}

export default function TaskDetails({
  task, projects, notes, actions, onChange, onClose, onDelete, onTimer, onNote, onShowCalendar, onToggleAction, onOpenAction, onCreateProject, onAddAction, onUngroup, onNeedDue,
}: {
  task: WorkTask;
  projects: string[];
  notes: WorkNote[];
  actions?: WorkTask[];
  onChange: (patch: Partial<WorkTask>) => void;
  onClose: () => void;
  onDelete: () => void;
  onTimer: () => void;
  onNote: (id: string) => void;
  onShowCalendar: (day: string) => void;
  onToggleAction?: (id: string) => void;
  onOpenAction?: (id: string) => void;
  onCreateProject: (name: string) => string | null;
  onAddAction?: (title: string) => void;
  onUngroup?: () => void;
  onNeedDue?: () => void;
}) {
  const [stepText, setStepText] = useState('');
  const [actionText, setActionText] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [more, setMore] = useState(() => task.minutes > 0 || !!task.repeat);
  const meeting = isMeetingTask(task);
  const group = isGroupTask(task);
  const bundle = isBundleTask(task);
  const items = actions || [];
  const finished = bundle ? items.filter(step => step.done).length : task.steps.filter(step => step.done).length;
  const source = notes.find(note => note.id === task.noteId);
  const kindLabel = meeting ? 'MEETING' : group ? 'GROUP' : 'TASK DETAILS';
  const untitled = meeting ? 'Untitled meeting' : group ? 'Untitled group' : 'Untitled task';

  const add = () => {
    const lines = stepText.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length) return;
    const ancestors = new Set<string>();
    let current = parent;
    while (current) {
      ancestors.add(current);
      current = task.steps.find(step => step.id === current)?.parentId || null;
    }
    onChange({
      steps: [
        ...task.steps.map(step => ancestors.has(step.id) ? {...step, done: false} : step),
        ...lines.map(title => ({id: crypto.randomUUID(), title, done: false, parentId: parent})),
      ],
    });
    setStepText('');
    setParent(null);
  };

  const renderSteps = (parentId: string | null, depth = 0): React.ReactNode => task.steps.filter(step => step.parentId === parentId).map(step => (
    <div className="step-branch" key={step.id}>
      <div className={`step-line ${step.done ? 'is-done' : ''}`}>
        <button className={`wr-check ${step.done ? 'checked' : ''}`} aria-label={`${step.done ? 'Uncheck' : 'Check'} ${step.title}`} onClick={() => onChange({steps: toggleStep(task.steps, step.id)})}>{step.done && <Icon name="check" size={12}/>}</button>
        {editing === step.id
          ? <input aria-label="Edit checklist item" autoFocus value={step.title} onChange={event => onChange({steps: task.steps.map(item => item.id === step.id ? {...item, title: event.target.value} : item)})} onBlur={() => { if (!step.title.trim()) onChange({steps: task.steps.map(item => item.id === step.id ? {...item, title: 'Untitled item'} : item)}); setEditing(null); }} onKeyDown={event => { if (event.key === 'Enter') setEditing(null); }}/>
          : <button className="step-title" onClick={() => setEditing(step.id)}>{step.title}</button>}
        <button className="wr-icon step-action" title="Add sub-item" disabled={depth >= 39} aria-label={`Add sub-item to ${step.title}`} onClick={() => { setParent(step.id); document.getElementById('step-input')?.focus(); }}><Icon name="sub" size={14}/></button>
        <button className="wr-icon step-action" aria-label={`Remove checklist item ${step.title}`} onClick={() => { const ids = descendantIds(task.steps, step.id); onChange({steps: task.steps.filter(item => !ids.has(item.id))}); if (parent && ids.has(parent)) setParent(null); }}><Icon name="close" size={13}/></button>
      </div>
      {renderSteps(step.id, depth + 1)}
    </div>
  ));

  return (
    <aside aria-label={meeting ? 'Meeting details' : group ? 'Group details' : 'Task details'} className="task-details">
      <div className="detail-top">
        <span><Icon name={meeting ? 'capture' : group ? 'grid' : 'list'} size={15}/> {kindLabel}</span>
        <button className="wr-icon" aria-label="Close task details" onClick={onClose}><Icon name="close" size={16}/></button>
      </div>
      <div className="detail-scroll">
        <div className="detail-badges">
          {task.done && <span className="detail-id">Completed</span>}
        </div>
        <textarea className="detail-title" aria-label={meeting ? 'Meeting title' : group ? 'Group title' : 'Task title'} rows={2} maxLength={300} value={task.title} onChange={event => onChange({title: event.target.value})} onBlur={() => { if (!task.title.trim()) onChange({title: untitled}); }}/>
        <button className={`complete-action ${task.done ? 'done' : ''}`} onClick={() => onChange({done: !task.done, completedAt: task.done ? '' : new Date().toISOString(), ...(!task.done && !bundle ? {steps: task.steps.map(step => ({...step, done: true}))} : {})})}>
          <Icon name="check" size={15}/>
          {task.done ? (meeting ? 'Completed · Reopen meeting' : group ? 'Completed · Reopen group' : 'Completed · Reopen task') : meeting ? 'Complete all action items' : group ? 'Complete all tasks' : 'Mark complete'}
        </button>
        <div className="detail-fields">
          <label>
            <span><Icon name="folder" size={15}/> Project</span>
            <ProjectPicker value={task.project} projects={projects} onSelect={project => onChange({project})} onCreate={onCreateProject}/>
          </label>
          <label>
            <span><Icon name="flag" size={15}/> Priority</span>
            <select value={task.priority} onChange={event => onChange({priority: event.target.value as Priority})}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
          {!bundle && <>
            <label>
              <span><Icon name="calendar" size={15}/> Due date</span>
              <input aria-label="Task due date" type="datetime-local" value={task.dueAt} onChange={event => onChange(applyDueChange(task, event.target.value))}/>
            </label>
            <div className="due-presets">
              <button type="button" className="wr-text" onClick={() => onChange(applyDueChange(task, rescheduleToDay(task.dueAt, calendarDay(localDateTime(0)))))}>Today</button>
              <button type="button" className="wr-text" onClick={() => onChange(applyDueChange(task, rescheduleToDay(task.dueAt, calendarDay(localDateTime(1)))))}>Tomorrow</button>
              {task.dueAt && <button type="button" className="wr-text" onClick={() => onChange(applyDueChange(task, ''))}>Clear date</button>}
              {task.dueAt && <button type="button" className="wr-text" onClick={() => onShowCalendar(calendarDay(task.dueAt))}>Show on calendar</button>}
            </div>
            <label>
              <span><Icon name="bell" size={15}/> Reminder</span>
              <input aria-label="Task reminder" type="datetime-local" value={task.remindAt} onChange={event => onChange({remindAt: event.target.value, notifiedAt: ''})}/>
            </label>
            <ReminderPresets dueAt={task.dueAt} remindAt={task.remindAt} onRemind={value => onChange({remindAt: value, notifiedAt: ''})} onMissingDue={onNeedDue}/>
            <details className="detail-more" open={more} onToggle={event => setMore((event.currentTarget as HTMLDetailsElement).open)}>
              <summary><span>More</span><Icon name="chevron" size={14}/></summary>
              <div className="detail-more-fields">
                <label>
                  <span><Icon name="clock" size={15}/> Estimate</span>
                  <div className="minute-input">
                    <input aria-label="Task estimate in minutes" type="number" min={1} max={600} placeholder="—" value={task.minutes || ''} onChange={event => {
                      const raw = event.target.value;
                      if (!raw) {
                        onChange({minutes: 0});
                        return;
                      }
                      const next = Number(raw);
                      if (next >= 1 && next <= 600) onChange({minutes: next});
                    }}/> min
                  </div>
                </label>
                <label>
                  <span>Repeats</span>
                  <select aria-label="Repeat schedule" value={task.repeat || ''} onChange={event => onChange({repeat: event.target.value as WorkTask['repeat'], seriesId: event.target.value ? (task.seriesId || task.id) : ''})}>
                    {REPEAT_OPTIONS.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                {isRepeatFreq(task.repeat) && task.dueAt && !task.done && (
                  <div className="due-presets">
                    <button type="button" className="wr-text" onClick={() => onChange(skipRepeat(task))}>Skip this time</button>
                  </div>
                )}
              </div>
            </details>
          </>}
        </div>
        {!bundle && task.remindAt && (
          <p className="reminder-hint"><span className="live-dot"/>{task.notifiedAt ? 'Reminder delivered. Change its time to schedule again.' : 'Reminder scheduled. Keep Workroom open to receive it.'}</p>
        )}
        <div className="detail-section-title"><h3>Context & notes</h3><Icon name="note" size={15}/></div>
        <textarea className="task-description" aria-label="Task context and notes" placeholder={meeting ? 'Add a short recap for this meeting…' : group ? 'What holds these tasks together?' : 'What’s the outcome? Add context, links, or anything you’ll need later…'} rows={3} value={task.body} onChange={event => onChange({body: event.target.value})}/>
        {source && (
          <button className="source-link" onClick={() => onNote(source.id)}>
            <Icon name="link" size={14}/>
            <span>{meeting ? 'Meeting notes' : 'From'} <strong>{source.title}</strong></span>
            <Icon name="arrow" size={13}/>
          </button>
        )}
        {bundle ? <>
          <div className="detail-section-title">
            <h3>{meeting ? 'Action items' : 'Tasks'} <span>{finished}/{items.length}</span></h3>
            <span>{items.length ? Math.round(finished / items.length * 100) : 0}%</span>
          </div>
          {items.length > 0 && <div className="steps-progress"><i style={{width: `${items.length ? finished / items.length * 100 : 0}%`}}/></div>}
          <p className="meeting-progress-copy">{bundleProgressLabel([task, ...items], task.id, meeting ? 'No action items' : 'No tasks')}</p>
          <div className="linked-tasks meeting-actions">
            {items.map(item => (
              <div key={item.id}>
                <button className={`wr-check ${item.done ? 'checked' : ''}`} aria-label={`${item.done ? 'Reopen' : 'Complete'} ${item.title}`} onClick={() => onToggleAction?.(item.id)}>{item.done && <Icon name="check" size={12}/>}</button>
                <button className={item.done ? 'struck' : ''} onClick={() => onOpenAction?.(item.id)}>{item.title}<Icon name="arrow" size={14}/></button>
              </div>
            ))}
            {!items.length && <p className="checklist-empty">{meeting ? 'Break the meeting into action items you can finish.' : 'Add tasks to this group.'}</p>}
          </div>
          <form className="step-add" onSubmit={event => { event.preventDefault(); if (!actionText.trim()) return; onAddAction?.(actionText); setActionText(''); }}>
            <Icon name="plus" size={15}/>
            <input aria-label={meeting ? 'New action item' : 'New grouped task'} value={actionText} onChange={event => setActionText(event.target.value)} placeholder={meeting ? 'Add an action item…' : 'Add a task…'}/>
            <button type="submit" aria-label={meeting ? 'Save action item' : 'Save grouped task'}>↵</button>
          </form>
          {group && onUngroup && <button type="button" className="wr-secondary" onClick={onUngroup}>Ungroup</button>}
        </> : <>
          <div className="detail-section-title">
            <h3>Checklist <span>{finished}/{task.steps.length}</span></h3>
            <span>{task.steps.length ? Math.round(finished / task.steps.length * 100) : 0}%</span>
          </div>
          {task.steps.length > 0 && <div className="steps-progress"><i style={{width: `${finished / task.steps.length * 100}%`}}/></div>}
          <div className="steps-tree">{renderSteps(null)}</div>
          {!task.steps.length && <p className="checklist-empty">Break the work into small, checkable steps.</p>}
          {parent && (
            <div className="parent-label">
              Adding under: {task.steps.find(step => step.id === parent)?.title}
              <button className="wr-icon" aria-label="Cancel nesting" onClick={() => setParent(null)}><Icon name="close" size={12}/></button>
            </div>
          )}
          <form className="step-add" onSubmit={event => { event.preventDefault(); add(); }}>
            <Icon name="plus" size={15}/>
            <input id="step-input" aria-label="New checklist item" value={stepText} onChange={event => setStepText(event.target.value)} placeholder={parent ? 'Add a sub-item…' : 'Add a checklist item…'}/>
            <button type="submit" aria-label="Save checklist item">↵</button>
          </form>
        </>}
      </div>
      <div className="detail-footer">
        <button className="wr-icon delete-task" aria-label={meeting ? 'Delete meeting' : group ? 'Delete group' : 'Delete task'} onClick={onDelete}><Icon name="trash" size={17}/></button>
        <span>Changes save automatically</span>
        {!bundle && <button className="wr-primary" disabled={task.done} onClick={onTimer}><Icon name="play" size={14}/> Focus</button>}
      </div>
    </aside>
  );
}

export {ReminderPresets};
