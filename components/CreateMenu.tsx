'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {Icon} from './WorkUI';

export default function CreateMenu({
  onAddTask,
  onAddSeveral,
  onCaptureMeeting,
  onNewProject,
  onMakeGroup,
}: {
  onAddTask: () => void;
  onAddSeveral: () => void;
  onCaptureMeeting: () => void;
  onNewProject: () => void;
  onMakeGroup: () => void;
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

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="create-menu" ref={root}>
      <button
        type="button"
        className="wr-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen(current => !current)}
      >
        <Icon name="plus" size={16}/> Add
      </button>
      {open && (
        <div className="create-menu-panel" id={`${id}-menu`} role="menu">
          <button type="button" role="menuitem" onClick={() => run(onAddTask)}>Add task</button>
          <button type="button" role="menuitem" onClick={() => run(onAddSeveral)}>Add several</button>
          <button type="button" role="menuitem" onClick={() => run(onCaptureMeeting)}>Capture meeting</button>
          <button type="button" role="menuitem" onClick={() => run(onMakeGroup)}>Make a group</button>
          <button type="button" role="menuitem" onClick={() => run(onNewProject)}>New project</button>
        </div>
      )}
    </div>
  );
}
