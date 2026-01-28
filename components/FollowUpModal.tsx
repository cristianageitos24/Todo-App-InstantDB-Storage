'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/instantdb';

interface Todo {
  id: string;
  text: string;
  followUp?: {
    dateTime: string;
    notes?: string;
  } | null;
}

interface FollowUpModalProps {
  isOpen: boolean;
  isPrompt: boolean;
  todoId: string | null;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
}

export default function FollowUpModal({ 
  isOpen, 
  isPrompt, 
  todoId, 
  onClose, 
  onYes, 
  onNo 
}: FollowUpModalProps) {
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && !isPrompt) {
      // Set default date to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setDateTime(formatDateTimeLocal(tomorrow));
    }
  }, [isOpen, isPrompt]);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get todo data for ICS generation
  // Query all user todos and filter by id client-side (type-safe approach)
  const user = db.useUser();
  const { data } = db.useQuery({
    todos: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  // Find the specific todo by id
  const todo = useMemo(() => {
    if (!todoId || !data?.todos) return undefined;
    return data.todos.find(t => t.id === todoId);
  }, [todoId, data?.todos]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime || !todoId) {
      alert('Please select a date and time');
      return;
    }

    const followUpData = {
      dateTime,
      notes: notes || ''
    };

    db.transact(
      db.tx.todos[todoId].update({
        followUp: followUpData
      })
    );

    // Generate and download .ics file
    if (todo) {
      generateICSFile(todo, followUpData);
    }
    
    onClose();
    setDateTime('');
    setNotes('');
  };

  const generateICSFile = (todo: Todo, followUpData: { dateTime: string; notes?: string }) => {
    const date = new Date(followUpData.dateTime);
    const endDate = new Date(date);
    endDate.setMinutes(endDate.getMinutes() + 15);
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const startDateStr = formatICSDate(date);
    const endDateStr = formatICSDate(endDate);
    const now = formatICSDate(new Date());
    
    const uid = `todo-${Date.now()}@todoapp.local`;
    
    const escapeICS = (text: string) => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };
    
    const description = followUpData.notes ? 
      `Todo: ${todo.text}\n\nNotes: ${followUpData.notes}` : 
      `Todo: ${todo.text}`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Todo App//Follow-up Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `SUMMARY:${escapeICS(todo.text)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeICS(todo.text)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo-reminder-${todo.text.substring(0, 20).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  if (isPrompt) {
    return (
      <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-content">
          <h2>Add Follow-up Reminder?</h2>
          <p>Would you like to set a calendar reminder for this todo?</p>
          <div className="modal-buttons">
            <button className="modal-btn primary" onClick={onYes}>
              Yes, Add Follow-up
            </button>
            <button className="modal-btn secondary" onClick={onNo}>
              No, Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content form-modal">
        <h2>Set Follow-up Details</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="followup-date">Date & Time:</label>
            <input
              type="datetime-local"
              id="followup-date"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="followup-notes">Additional Notes (optional):</label>
            <textarea
              id="followup-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
            />
          </div>
          <div className="form-buttons">
            <button type="submit" className="modal-btn primary">
              Create Calendar Event
            </button>
            <button 
              type="button" 
              className="modal-btn secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
