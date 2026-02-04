'use client';

import { useState, useEffect } from 'react';
import { db, id } from '@/lib/instantdb';
import TodoItem from './TodoItem';
import FollowUpModal from './FollowUpModal';
import NotesModal from './NotesModal';
import SettingsModal from './SettingsModal';

export default function TodoApp() {
  const user = db.useUser();
  const [todoText, setTodoText] = useState('');
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null);
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Query todos for current user
  const { data, isLoading } = db.useQuery({
    todos: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  // Query user profile for display name
  const { data: profileData } = db.useQuery({
    userProfiles: {
      $: {
        where: { userId: user.id }
      }
    }
  });

  const todos = data?.todos || [];
  const profile = profileData?.userProfiles?.[0];
  const displayName = profile?.displayName || `${user.email?.split('@')[0] || 'My'}'s Todo List`;

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const themeToApply = savedTheme || 'dark';
    const root = document.documentElement;
    if (themeToApply === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
  }, []);

  // Migrate localStorage data on first load
  useEffect(() => {
    if (!migrationDone && user.id) {
      migrateLocalStorageData();
      setMigrationDone(true);
    }
  }, [user.id, migrationDone]);

  const migrateLocalStorageData = () => {
    try {
      const localTodos = localStorage.getItem('todos');
      if (!localTodos) return;
      
      const parsedTodos = JSON.parse(localTodos);
      if (!Array.isArray(parsedTodos) || parsedTodos.length === 0) return;
      
      // Check if user already has todos in InstantDB
      if (todos.length > 0) {
        // User already has data, don't migrate
        localStorage.removeItem('todos');
        return;
      }
      
      // Migrate todos to InstantDB
      const transactions = parsedTodos.map((todo: any) => {
        const todoId = id();
        return db.tx.todos[todoId].update({
          text: todo.text || '',
          completed: todo.completed || false,
          followUp: todo.followUp || null,
          completedDate: todo.completedDate || null,
          createdDate: todo.createdDate || new Date().toISOString(),
          userId: user.id
        });
      });
      
      if (transactions.length > 0) {
        db.transact(transactions);
        localStorage.removeItem('todos');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const text = todoText.trim();
    if (!text) return;

    const todoId = id();
    const createdDate = new Date().toISOString();
    
    db.transact(
      db.tx.todos[todoId].update({
        text,
        completed: false,
        followUp: null,
        completedDate: null,
        createdDate,
        userId: user.id
      })
    );
    
    setCurrentTodoId(todoId);
    setTodoText('');
    setShowFollowUpPrompt(true);
  };

  // Sort todos: uncompleted first (most recent first), then completed (most recent first)
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    if (a.completed && b.completed) {
      const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
      const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    }
    
    if (!a.completed && !b.completed) {
      const dateA = a.createdDate ? new Date(a.createdDate) : new Date(0);
      const dateB = b.createdDate ? new Date(b.createdDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    }
    
    return 0;
  });

  if (isLoading) {
    return (
      <div className="app-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="app-container">
      <button 
        className="settings-button"
        onClick={() => setShowSettingsModal(true)}
        title="Settings"
        aria-label="Open settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </button>
      <h1>{displayName}</h1>
      <div className="wrapper">
        <form className="todo-form" onSubmit={handleAddTodo}>
          <input
            id="todo-input"
            type="text"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            placeholder="write anything and hit enter to add"
            autoComplete="off"
          />
          <button id="add-button" type="submit">ADD</button>
        </form>
        <ul id="todo-list">
          {sortedTodos.map((todo) => (
            <TodoItem 
              key={todo.id} 
              todo={todo}
              onShowNotes={(todoId) => {
                setSelectedTodoId(todoId);
                setShowNotesModal(true);
              }}
              onAddNotes={(todoId) => {
                setSelectedTodoId(todoId);
                setShowNotesModal(true);
              }}
              onEditFollowUp={(todoId) => {
                setCurrentTodoId(todoId);
                setShowFollowUpPrompt(false);
                setShowFollowUpForm(true);
              }}
            />
          ))}
        </ul>
      </div>

      <FollowUpModal
        isOpen={showFollowUpPrompt || showFollowUpForm}
        isPrompt={showFollowUpPrompt}
        todoId={currentTodoId}
        onClose={() => {
          setShowFollowUpPrompt(false);
          setShowFollowUpForm(false);
          setCurrentTodoId(null);
        }}
        onYes={() => {
          setShowFollowUpPrompt(false);
          setShowFollowUpForm(true);
        }}
        onNo={() => {
          setShowFollowUpPrompt(false);
          setCurrentTodoId(null);
        }}
      />

      <NotesModal
        isOpen={showNotesModal}
        todoId={selectedTodoId}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedTodoId(null);
        }}
        onEditDateTime={(todoId) => {
          setShowNotesModal(false);
          setSelectedTodoId(null);
          setCurrentTodoId(todoId);
          setShowFollowUpPrompt(false);
          setShowFollowUpForm(true);
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
