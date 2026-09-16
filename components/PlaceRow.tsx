'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {Icon} from './WorkUI';
import {isSmart, Place, SMART_PLACES, samePlace} from '@/lib/workroom-views';

export default function PlaceRow({
  place,
  projects,
  projectCounts,
  todayCount,
  onPlace,
  onNewProject,
}: {
  place: Place;
  projects: string[];
  projectCounts: Record<string, number>;
  todayCount: number;
  onPlace: (place: Place) => void;
  onNewProject: () => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="place-row">
      {SMART_PLACES.map(item => (
        <button
          key={item.id}
          type="button"
          aria-pressed={isSmart(place, item.id)}
          onClick={() => onPlace({kind: 'smart', id: item.id})}
        >
          {item.label}
          {item.id === 'today' && todayCount > 0 && <span>{todayCount}</span>}
        </button>
      ))}
      <div className="place-projects" ref={root}>
        <button
          type="button"
          className="place-projects-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={`${id}-projects`}
          aria-pressed={place.kind === 'project'}
          onClick={() => setOpen(current => !current)}
        >
          {place.kind === 'project' ? place.name : 'Projects'}
          <Icon name="chevron" size={14}/>
        </button>
        {open && (
          <div className="place-projects-menu" id={`${id}-projects`} role="menu" aria-label="Projects">
            {projects.map(name => (
              <button
                type="button"
                role="menuitem"
                className={samePlace(place, {kind: 'project', name}) ? 'is-selected' : ''}
                key={name}
                onClick={() => {
                  onPlace({kind: 'project', name});
                  setOpen(false);
                }}
              >
                <span>{name}</span>
                <small>{projectCounts[name] || 0}</small>
              </button>
            ))}
            <button type="button" role="menuitem" className="is-create" onClick={() => {setOpen(false); onNewProject();}}>
              <Icon name="plus" size={14}/> New project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
