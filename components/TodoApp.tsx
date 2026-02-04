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
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
          <path d="m370-80-16-128q-19-7-40-19t-37-25l-119 69-93-164 108-79q-2-9-2.5-20.5T185-360q0-9 1.5-20.5t2.5-20.5L82-480l93-164 119 69q16-13 37-25t40-18l16-128h184l16 128q19 7 40.5 18.5T669-575l119-69 93 164-108 77q1 10 2 21t1 22q0 10-1 21t-2 21l108 78-93 164-118-69q-16 13-36.5 25.5T554-208l-16 128H370Zm92-200q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Zm0-80q-20 0-35-15t-15-35q0-20 15-35t35-15q20 0 35 15t15 35q0 20-15 35t-35 15Zm-6 240h12l12-96q32-8 59.5-22t50.5-36l88 50 40-72-80-58q6-18 9-36t3-38q0-20-3-38t-9-36l80-58-40-72-88 50q-23-24-50.5-38T480-696l-12-96h-16l-12 96q-32 8-59.5 22T330-696l-88-50-40 72 80 58q-6 18-9 36t-3 38q0 20 3 38t9 36l-80 58 40 72 88-50q23 24 50.5 38t59.5 22l12 96Zm6-280Z"/>
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
