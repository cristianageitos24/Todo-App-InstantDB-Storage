'use client';

import { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/instantdb';

interface NotesModalProps {
  isOpen: boolean;
  todoId: string | null;
  onClose: () => void;
  onEditDateTime?: (todoId: string) => void;
}

export default function NotesModal({ isOpen, todoId, onClose, onEditDateTime }: NotesModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  const user = db.useUser();
  const { data } = db.useQuery({
    todos: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  const todo = useMemo(() => {
    if (!todoId || !data?.todos) return undefined;
    return data.todos.find(t => t.id === todoId);
  }, [todoId, data?.todos]);

  const notes = todo?.followUp?.notes;
  const hasNotes = !!(notes && notes.trim().length > 0);
  const hasDate = !!(todo?.followUp?.dateTime);

  useEffect(() => {
    if (isOpen && todo) {
      if (hasNotes) {
        setIsEditMode(false);
        setEditNotes(notes ?? '');
      } else {
        setIsEditMode(true);
        setEditNotes('');
      }
    }
  }, [isOpen, todo?.id, hasNotes, notes]);

  const handleSave = () => {
    if (!todoId || !todo) return;
    const newNotes = editNotes.trim();
    const followUp = todo.followUp ?? {};
    const updatedFollowUp = { ...followUp, notes: newNotes };
    db.transact(
      db.tx.todos[todoId].update({ followUp: updatedFollowUp })
    );
    setIsEditMode(false);
    if (!newNotes) onClose();
  };

  const handleCancel = () => {
    if (hasNotes) {
      setEditNotes(notes ?? '');
      setIsEditMode(false);
    } else {
      onClose();
    }
  };

  const handleEditDateTime = () => {
    if (todoId) {
      onEditDateTime?.(todoId);
      onClose();
    }
  };

  if (!isOpen || !todoId || !todo) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>{todo.text}</h2>
          <button 
            className="modal-btn secondary" 
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
          >
            Close
          </button>
        </div>

        {isEditMode ? (
          <>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="notes-edit">Notes:</label>
              <textarea
                id="notes-edit"
                rows={5}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes for this todo..."
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div className="form-buttons" style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="modal-btn primary" onClick={handleSave}>
                Save
              </button>
              <button type="button" className="modal-btn secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ 
              color: 'var(--text-color)', 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word',
              marginBottom: '15px'
            }}>
              {notes ? notes : 'No notes for this todo.'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button" 
                className="modal-btn primary"
                onClick={() => setIsEditMode(true)}
              >
                Edit notes
              </button>
              {hasDate && onEditDateTime && (
                <button 
                  type="button" 
                  className="modal-btn secondary"
                  onClick={handleEditDateTime}
                >
                  Edit date & time
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
