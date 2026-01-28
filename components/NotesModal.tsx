'use client';

import { db } from '@/lib/instantdb';

interface NotesModalProps {
  isOpen: boolean;
  todoId: string | null;
  onClose: () => void;
}

export default function NotesModal({ isOpen, todoId, onClose }: NotesModalProps) {
  const { data } = db.useQuery(
    todoId ? {
      todos: {
        $: {
          where: { id: todoId }
        }
      }
    } : {}
  );

  const todo = data?.todos?.[0];

  if (!isOpen || !todoId || !todo) return null;

  const notes = todo.followUp?.notes;

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
        <div style={{ 
          color: 'var(--text-color)', 
          lineHeight: 1.6, 
          whiteSpace: 'pre-wrap', 
          wordWrap: 'break-word' 
        }}>
          {notes ? notes : 'No notes for this todo.'}
        </div>
      </div>
    </div>
  );
}
