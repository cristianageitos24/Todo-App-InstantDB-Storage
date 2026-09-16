'use client';
import {useEffect, useRef, useState} from 'react';
import {Icon} from './WorkUI';
import ProjectPicker from './ProjectPicker';
import {composerDefaults, Place} from '@/lib/workroom-views';
import {Priority, WorkTask} from '@/lib/workroom';

export default function TaskComposer({
  place,
  projects,
  today,
  focusSignal,
  onCreate,
  onCreateProject,
}: {
  place: Place;
  projects: string[];
  today: string;
  focusSignal: number;
  onCreate: (title: string, patch: Partial<WorkTask>) => void;
  onCreateProject: (name: string) => string | null;
}) {
  const defaults = composerDefaults(place);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState('');
  const [project, setProject] = useState(defaults.project);
  const [dueAt, setDueAt] = useState(defaults.dueAt);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [open, setOpen] = useState(false);

  const seenFocus = useRef(focusSignal);

  useEffect(() => {
    const next = composerDefaults(place);
    setProject(next.project);
    setDueAt(next.dueAt);
  }, [place]);

  useEffect(() => {
    if (focusSignal <= seenFocus.current) {
      seenFocus.current = focusSignal;
      return;
    }
    seenFocus.current = focusSignal;
    setOpen(true);
    input.current?.focus();
  }, [focusSignal]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node) && !title.trim()) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !title.trim()) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, title]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const next = composerDefaults(place);
    onCreate(trimmed, {
      project: projects.includes(project) ? project : next.project,
      priority,
      dueAt: dueAt || next.dueAt,
      ...(next.starToday ? {today} : {}),
    });
    setTitle('');
    setOpen(true);
    input.current?.focus();
  };

  return (
    <form className={`work-quick-add task-composer${open ? ' is-open' : ''}`} ref={root} onSubmit={onSubmit}>
      <div className="composer-main">
        <span><Icon name="plus" size={17}/></span>
        <input
          ref={input}
          aria-label="Quick add task"
          placeholder="Add a task…"
          value={title}
          onChange={event => setTitle(event.target.value)}
          onFocus={() => setOpen(true)}
          maxLength={300}
        />
        <button type="submit" aria-label="Save quick task">↵</button>
      </div>
      {open && (
        <div className="composer-details">
          <label>
            Project
            <ProjectPicker
              value={projects.includes(project) ? project : 'General'}
              projects={projects}
              onSelect={setProject}
              onCreate={name => {
                const error = onCreateProject(name);
                if (!error) setProject(name.trim().slice(0, 80));
                return error;
              }}
            />
          </label>
          <label>
            Due
            <input type="datetime-local" value={dueAt} onChange={event => setDueAt(event.target.value)}/>
          </label>
          <label>
            Priority
            <select value={priority} onChange={event => setPriority(event.target.value as Priority)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
        </div>
      )}
    </form>
  );
}
