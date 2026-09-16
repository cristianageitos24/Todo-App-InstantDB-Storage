'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {Icon} from './WorkUI';

export default function ProjectPicker({
  value,
  projects,
  onSelect,
  onCreate,
}: {
  value: string;
  projects: string[];
  onSelect: (project: string) => void;
  onCreate: (name: string) => string | null;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setName('');
    setError('');
    setActive(-1);
  };

  const startCreate = () => {
    setCreating(true);
    setOpen(false);
    setError('');
    setName('');
    setTimeout(() => createRef.current?.focus(), 0);
  };

  const submitCreate = () => {
    const result = onCreate(name);
    if (result) {
      setError(result);
      return;
    }
    close();
  };

  useEffect(() => {
    if (!open && !creating) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if (!open || creating) return;
      const last = projects.length;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(current => (current + 1) % (last + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(current => (current <= 0 ? last : current - 1));
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        if (active >= last) startCreate();
        else {
          onSelect(projects[active]);
          close();
        }
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, creating, active, projects, onSelect]);

  return (
    <div className={`project-picker ${open || creating ? 'is-open' : ''}`} ref={root}>
      {creating ? (
        <div className="project-create">
          <input
            ref={createRef}
            id={`${id}-create`}
            aria-label="New project name"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            maxLength={80}
            placeholder="Project name"
            value={name}
            onChange={event => {
              setName(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitCreate();
              }
            }}
          />
          <button type="button" className="wr-text" onClick={submitCreate}>Create</button>
        </div>
      ) : (
        <button
          type="button"
          className="project-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-label="Project"
          onClick={() => setOpen(current => !current)}
        >
          <span>{value || 'General'}</span>
          <Icon name="chevron" size={14}/>
        </button>
      )}
      {open && !creating && (
        <div className="project-menu" id={`${id}-list`} role="listbox" aria-label="Projects">
          {projects.map((project, index) => (
            <button
              type="button"
              role="option"
              aria-selected={project === value}
              className={`project-option ${project === value ? 'is-selected' : ''} ${index === active ? 'is-active' : ''}`}
              key={project}
              onMouseEnter={() => setActive(index)}
              onClick={() => {
                onSelect(project);
                close();
              }}
            >
              {project}
            </button>
          ))}
          <button
            type="button"
            className={`project-option is-create ${active === projects.length ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(projects.length)}
            onClick={startCreate}
          >
            <Icon name="plus" size={14}/> New project
          </button>
        </div>
      )}
      {error && <p className="project-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
