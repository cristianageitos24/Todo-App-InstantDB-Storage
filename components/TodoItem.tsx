'use client';

import { db } from '@/lib/instantdb';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  followUp?: {
    dateTime: string;
    notes?: string;
  } | null;
  completedDate?: string | number | null;
  createdDate: string | number;
}

interface TodoItemProps {
  todo: Todo;
  onShowNotes?: (todoId: string) => void;
}

export default function TodoItem({ todo, onShowNotes }: TodoItemProps) {
  const isOverdue = checkIfOverdue(todo);
  const hasNotes = todo.followUp?.notes && todo.followUp.notes.trim().length > 0;

  const handleToggle = () => {
    const completed = !todo.completed;
    const completedDate = completed ? new Date().toISOString() : null;
    
    db.transact(
      db.tx.todos[todo.id].update({ 
        completed,
        completedDate
      })
    );
  };

  const handleDelete = () => {
    db.transact(db.tx.todos[todo.id].delete());
  };

  const handleDownloadCalendar = () => {
    if (todo.followUp) {
      generateICSFile(todo, todo.followUp);
    }
  };

  return (
    <li className={`todo ${isOverdue ? 'overdue' : ''}`}>
      <input
        type="checkbox"
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onChange={handleToggle}
      />
      <label className="custom-checkbox" htmlFor={`todo-${todo.id}`}>
        <svg fill="transparent" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
          <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
        </svg>
      </label>
      <span 
        className="todo-text"
        onClick={() => onShowNotes?.(todo.id)}
      >
        {todo.text}
        {todo.followUp && (
          <span className="followup-indicator" title={`Follow-up: ${formatFollowUpDate(todo.followUp.dateTime)}`}>
            📅 {formatFollowUpDate(todo.followUp.dateTime)}
            {hasNotes && <span className="view-notes-text"> · view notes</span>}
          </span>
        )}
      </span>
      {todo.followUp && (
        <button 
          className="followup-actions" 
          onClick={handleDownloadCalendar}
          title="Download calendar event"
        >
          <svg fill="var(--accent-color)" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20">
            <path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/>
          </svg>
        </button>
      )}
      <button className="delete-button" onClick={handleDelete}>
        <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </button>
    </li>
  );
}

function checkIfOverdue(todo: Todo) {
  if (!todo.followUp || todo.completed) {
    return false;
  }
  const followUpDate = new Date(todo.followUp.dateTime);
  const now = new Date();
  return followUpDate < now;
}

function formatFollowUpDate(dateTimeString: string) {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function generateICSFile(todo: Todo, followUpData: { dateTime: string; notes?: string }) {
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
}
