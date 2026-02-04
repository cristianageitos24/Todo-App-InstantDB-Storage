'use client';

import { useState, useEffect } from 'react';
import { db, id } from '@/lib/instantdb';
import UserProfile from './UserProfile';
import TodoItem from './TodoItem';
import FollowUpModal from './FollowUpModal';
import NotesModal from './NotesModal';

export default function TodoApp() {
  const user = db.useUser();
  const [todoText, setTodoText] = useState('');
  const [currentTodoId, setCurrentTodoId] = useState<string | null>(null);
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

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
      <UserProfile userId={user.id} />
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
    </div>
  );
}
