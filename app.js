// Import InstantDB and config
import { init, id } from "https://cdn.jsdelivr.net/npm/@instantdb/core@0.22.112/dist/index.js";
import { INSTANTDB_APP_ID, schema } from "./config.js";

// Check if app ID is configured
if (INSTANTDB_APP_ID === '__YOUR_APP_ID__') {
  console.error('Please configure your InstantDB App ID in config.js');
  document.body.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--text-color);">
      <h2 style="color: var(--accent-color); margin-bottom: 20px;">Configuration Required</h2>
      <p>Please set your InstantDB App ID in config.js</p>
      <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
        Get your App ID from <a href="https://instantdb.com/dash" target="_blank" style="color: var(--accent-color);">instantdb.com/dash</a>
      </p>
    </div>
  `;
}

// Initialize InstantDB
const db = init({ 
  appId: INSTANTDB_APP_ID,
  schema: schema
});

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const magicCodeGroup = document.getElementById('magic-code-group');
const magicCodeInput = document.getElementById('magic-code');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const signOutBtn = document.getElementById('sign-out-btn');
const displayNameInput = document.getElementById('display-name-input');
const userTitle = document.getElementById('user-title');

const todoForm = document.querySelector('form');
const todoInput = document.getElementById('todo-input');
const todoListUL = document.getElementById('todo-list');
const followupModal = document.getElementById('followup-modal');
const followupFormModal = document.getElementById('followup-form-modal');
const followupYesBtn = document.getElementById('followup-yes');
const followupNoBtn = document.getElementById('followup-no');
const followupCancelBtn = document.getElementById('followup-cancel');
const followupForm = document.getElementById('followup-form');
const notesModal = document.getElementById('notes-modal');
const notesCloseBtn = document.getElementById('notes-close');

// State
let currentUser = null;
let allTodos = [];
let todosMap = new Map(); // Map of todo ID to todo object for quick lookup
let currentTodoId = null; // Track which todo we're adding follow-up for
let userProfile = null;
let migrationDone = false;

// Authentication State
let authState = 'email'; // 'email' or 'code'
let pendingEmail = null;

// Initialize app
initApp();

async function initApp() {
  setupEventListeners();
  
  // Check if user is already authenticated by checking localStorage
  // InstantDB stores auth state automatically, but we need to verify
  // Try to load user data - if it fails, show auth screen
  const storedUserId = localStorage.getItem('instantdb_user_id');
  const storedUserEmail = localStorage.getItem('instantdb_user_email');
  
  if (storedUserId && storedUserEmail) {
    // Assume user is authenticated, try to load data
    currentUser = { id: storedUserId, email: storedUserEmail };
    showApp();
    await loadUserData();
  } else {
    showAuth();
  }
}

function setupEventListeners() {
  // Auth form submission
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }
  
  // Sign out
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
  
  // Display name input
  if (displayNameInput) {
    displayNameInput.addEventListener('blur', handleDisplayNameChange);
    displayNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });
  }
  
  // Todo form
  if (todoForm) {
    todoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTodo();
    });
  }
  
  const addButton = document.getElementById('add-button');
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      addTodo();
    });
  }
  
  // Follow-up modals
  if (followupYesBtn) {
    followupYesBtn.addEventListener('click', () => {
      followupModal.classList.remove('active');
      followupFormModal.classList.add('active');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      document.getElementById('followup-date').value = formatDateTimeLocal(tomorrow);
    });
  }
  
  if (followupNoBtn) {
    followupNoBtn.addEventListener('click', () => {
      followupModal.classList.remove('active');
      currentTodoId = null;
    });
  }
  
  if (followupCancelBtn) {
    followupCancelBtn.addEventListener('click', () => {
      followupFormModal.classList.remove('active');
      currentTodoId = null;
      followupForm.reset();
    });
  }
  
  if (followupForm) {
    followupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      createFollowUp();
    });
  }
  
  // Close modals when clicking outside
  if (followupModal) {
    followupModal.addEventListener('click', (e) => {
      if (e.target === followupModal) {
        followupModal.classList.remove('active');
        currentTodoId = null;
      }
    });
  }
  
  if (followupFormModal) {
    followupFormModal.addEventListener('click', (e) => {
      if (e.target === followupFormModal) {
        followupFormModal.classList.remove('active');
        currentTodoId = null;
        followupForm.reset();
      }
    });
  }
  
  // Notes modal
  if (notesCloseBtn) {
    notesCloseBtn.addEventListener('click', () => {
      if (notesModal) notesModal.classList.remove('active');
    });
  }
  
  if (notesModal) {
    notesModal.addEventListener('click', (e) => {
      if (e.target === notesModal) {
        notesModal.classList.remove('active');
      }
    });
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  hideAuthError();
  
  const email = authEmail.value.trim();
  
  if (!email) {
    showAuthError('Please enter your email address');
    return;
  }
  
  if (authState === 'email') {
    // Send magic code
    try {
      await db.auth.sendMagicCode({ email });
      pendingEmail = email;
      authState = 'code';
      magicCodeGroup.style.display = 'block';
      authSubmit.textContent = 'Sign In';
      authEmail.disabled = true;
      showAuthError('Check your email for the magic code', 'success');
    } catch (error) {
      showAuthError(error.message || 'Failed to send magic code');
    }
  } else {
    // Verify magic code
    const code = magicCodeInput.value.trim();
    if (!code) {
      showAuthError('Please enter the magic code');
      return;
    }
    
    try {
      const result = await db.auth.signInWithMagicCode({ 
        email: pendingEmail, 
        code 
      });
      
      if (result.error) {
        showAuthError(result.error.message || 'Invalid code');
        return;
      }
      
      // Use email as a consistent user identifier
      // InstantDB's permission system will handle user isolation
      // We use email as userId since it's unique and consistent
      const userId = result.user?.id || pendingEmail;
      
      currentUser = { 
        id: userId, 
        email: pendingEmail 
      };
      
      localStorage.setItem('instantdb_user_id', userId);
      localStorage.setItem('instantdb_user_email', pendingEmail);
      
      await loadUserData();
      showApp();
    } catch (error) {
      showAuthError(error.message || 'Failed to sign in');
    }
  }
}

async function handleSignOut() {
  try {
    await db.auth.signOut();
    currentUser = null;
    allTodos = [];
    todosMap.clear();
    userProfile = null;
    migrationDone = false;
    authState = 'email';
    pendingEmail = null;
    
    // Clear stored user info
    localStorage.removeItem('instantdb_user_id');
    localStorage.removeItem('instantdb_user_email');
    
    showAuth();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

function showAuth() {
  if (authContainer) authContainer.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
  // Reset auth form
  authState = 'email';
  pendingEmail = null;
  if (authForm) authForm.reset();
  if (magicCodeGroup) magicCodeGroup.style.display = 'none';
  if (authSubmit) authSubmit.textContent = 'Send Magic Code';
  if (authEmail) authEmail.disabled = false;
  hideAuthError();
}

function showApp() {
  if (authContainer) authContainer.style.display = 'none';
  if (appContainer) appContainer.style.display = 'block';
}

function showAuthError(message, type = 'error') {
  if (authError) {
    authError.textContent = message;
    authError.style.display = 'block';
    authError.className = `auth-error ${type}`;
  }
}

function hideAuthError() {
  if (authError) {
    authError.style.display = 'none';
  }
}

async function loadUserData() {
  if (!currentUser) {
    showAuth();
    return;
  }
  
  // Migrate localStorage data if needed
  if (!migrationDone) {
    await migrateLocalStorageData();
    migrationDone = true;
  }
  
  // Subscribe to todos for this user
  // Note: InstantDB automatically filters by userId if schema has userId field
  db.subscribeQuery(
    { 
      todos: {} 
    },
    (resp) => {
      if (resp.error) {
        console.error('Query error:', resp.error);
        // If auth error, redirect to login
        if (resp.error.message?.includes('auth') || resp.error.message?.includes('permission')) {
          handleSignOut();
        }
        return;
      }
      if (resp.data) {
        // Filter todos by current user (InstantDB should handle this, but double-check)
        const userTodos = (resp.data.todos || []).filter(todo => 
          todo.userId === currentUser.id
        );
        updateTodosFromDB(userTodos);
      }
    }
  );
  
  // Subscribe to user profile
  db.subscribeQuery(
    {
      userProfiles: {}
    },
    (resp) => {
      if (resp.error) {
        console.error('Profile query error:', resp.error);
        return;
      }
      if (resp.data && resp.data.userProfiles) {
        // Find profile for current user
        const profile = resp.data.userProfiles.find(p => p.userId === currentUser.id);
        if (profile) {
          userProfile = profile;
          updateDisplayName();
        } else {
          // Create default profile if none exists
          createDefaultProfile();
        }
      } else {
        createDefaultProfile();
      }
    }
  );
}

async function loadUserProfile() {
  // Profile will be loaded via subscription
}

async function createDefaultProfile() {
  if (!currentUser || userProfile) return;
  
  const defaultName = currentUser.email?.split('@')[0] || 'My';
  const profileId = id();
  
  db.transact(
    db.tx.userProfiles[profileId].update({
      displayName: `${defaultName}'s Todo List`,
      userId: currentUser.id
    })
  );
}

async function migrateLocalStorageData() {
  if (!currentUser) return;
  
  try {
    const localTodos = localStorage.getItem('todos');
    if (!localTodos) return;
    
    const parsedTodos = JSON.parse(localTodos);
    if (!Array.isArray(parsedTodos) || parsedTodos.length === 0) return;
    
    // Check if user already has todos in InstantDB
    const existingTodos = Array.from(todosMap.values());
    if (existingTodos.length > 0) {
      // User already has data, don't migrate
      return;
    }
    
    // Migrate todos to InstantDB
    const transactions = parsedTodos.map(todo => {
      const todoId = id();
      return db.tx.todos[todoId].update({
        text: todo.text || '',
        completed: todo.completed || false,
        followUp: todo.followUp || null,
        completedDate: todo.completedDate || null,
        createdDate: todo.createdDate || new Date().toISOString(),
        userId: currentUser.id
      });
    });
    
    if (transactions.length > 0) {
      db.transact(transactions);
      // Clear localStorage after migration
      localStorage.removeItem('todos');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
}

function updateTodosFromDB(todos) {
  todosMap.clear();
  todos.forEach(todo => {
    todosMap.set(todo.id, todo);
  });
  allTodos = Array.from(todosMap.values());
  updateTodoList();
}

function updateTodoList() {
  // Sort todos: uncompleted first (most recent first), then completed (most recent first)
  const sortedTodos = [...allTodos].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    if (a.completed && b.completed) {
      const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
      const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
      return dateB - dateA;
    }
    
    if (!a.completed && !b.completed) {
      const dateA = a.createdDate ? new Date(a.createdDate) : new Date(0);
      const dateB = b.createdDate ? new Date(b.createdDate) : new Date(0);
      return dateB - dateA;
    }
    
    return 0;
  });
  
  todoListUL.innerHTML = "";
  sortedTodos.forEach((todo) => {
    const todoItem = createTodoItem(todo);
    todoListUL.append(todoItem);
  });
}

function createTodoItem(todo) {
  const todoId = todo.id;
  const todoLI = document.createElement("li");
  const todoText = todo.text;
  
  const isOverdue = checkIfOverdue(todo);
  todoLI.className = isOverdue ? "todo overdue" : "todo";
  
  const hasNotes = todo.followUp && todo.followUp.notes && todo.followUp.notes.trim().length > 0;
  const followUpIndicator = todo.followUp ? 
    `<span class="followup-indicator" title="Follow-up: ${formatFollowUpDate(todo.followUp.dateTime)}">
      📅 ${formatFollowUpDate(todo.followUp.dateTime)}${hasNotes ? ' <span class="view-notes-text">· view notes</span>' : ''}
    </span>` : '';
  
  todoLI.innerHTML = `
    <input type="checkbox" id="todo-${todoId}">
    <label class="custom-checkbox" for="todo-${todoId}">
      <svg fill="transparent" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
    </label>
    <span class="todo-text" data-todo-id="${todoId}">
      ${todoText}
      ${followUpIndicator}
    </span>
    ${todo.followUp ? `<button class="followup-actions" title="Download calendar event">
      <svg fill="var(--accent-color)" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/></svg>
    </button>` : ''}
    <button class="delete-button">
      <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
    </button>
  `;
  
  const deleteButton = todoLI.querySelector(".delete-button");
  deleteButton.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTodoItem(todoId);
  });
  
  if (todo.followUp) {
    const followUpBtn = todoLI.querySelector(".followup-actions");
    if (followUpBtn) {
      followUpBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openFollowUpActions(todoId);
      });
    }
  }
  
  const todoTextElement = todoLI.querySelector(".todo-text");
  todoTextElement.addEventListener("click", (e) => {
    e.stopPropagation();
    showNotesModal(todoId);
  });
  
  const checkbox = todoLI.querySelector("input[type='checkbox']");
  if (checkbox) {
    checkbox.addEventListener("change", () => {
      const completed = checkbox.checked;
      const completedDate = completed ? new Date().toISOString() : null;
      
      db.transact(
        db.tx.todos[todoId].update({ 
          completed,
          completedDate
        })
      );
    });
    checkbox.checked = todo.completed;
  }
  
  return todoLI;
}

function addTodo() {
  if (!todoInput || !currentUser) {
    console.error('Todo input not found or user not authenticated!');
    return;
  }
  
  const todoText = todoInput.value.trim();
  if (todoText.length > 0) {
    const todoId = id();
    const createdDate = new Date().toISOString();
    
    db.transact(
      db.tx.todos[todoId].update({
        text: todoText,
        completed: false,
        followUp: null,
        completedDate: null,
        createdDate: createdDate,
        userId: currentUser.id
      })
    );
    
    currentTodoId = todoId;
    todoInput.value = "";
    
    // Show follow-up prompt
    if (followupModal) {
      followupModal.classList.add('active');
    }
  }
}

function deleteTodoItem(todoId) {
  db.transact(db.tx.todos[todoId].delete());
}

async function handleDisplayNameChange() {
  if (!currentUser || !displayNameInput) return;
  
  const newName = displayNameInput.value.trim();
  if (!newName) {
    // Restore previous name
    updateDisplayName();
    return;
  }
  
  if (userProfile) {
    // Update existing profile
    db.transact(
      db.tx.userProfiles[userProfile.id].update({
        displayName: newName
      })
    );
  } else {
    // Create new profile
    const profileId = id();
    db.transact(
      db.tx.userProfiles[profileId].update({
        displayName: newName,
        userId: currentUser.id
      })
    );
  }
}

function updateDisplayName() {
  if (userProfile && userProfile.displayName) {
    if (userTitle) {
      userTitle.textContent = userProfile.displayName;
    }
    if (displayNameInput) {
      displayNameInput.value = userProfile.displayName;
    }
  } else {
    const defaultName = currentUser?.email?.split('@')[0] || 'My';
    const defaultDisplayName = `${defaultName}'s Todo List`;
    if (userTitle) {
      userTitle.textContent = defaultDisplayName;
    }
    if (displayNameInput) {
      displayNameInput.value = defaultDisplayName;
    }
  }
}

function createFollowUp() {
  const dateTime = document.getElementById('followup-date').value;
  const notes = document.getElementById('followup-notes').value;
  
  if (!dateTime || !currentTodoId) {
    alert('Please select a date and time');
    return;
  }
  
  const followUpData = {
    dateTime: dateTime,
    notes: notes || ''
  };
  
  const todo = todosMap.get(currentTodoId);
  if (todo) {
    db.transact(
      db.tx.todos[currentTodoId].update({
        followUp: followUpData
      })
    );
    
    // Generate and download .ics file
    generateICSFile(todo, followUpData);
  }
  
  // Close modal and reset
  followupFormModal.classList.remove('active');
  followupForm.reset();
  currentTodoId = null;
}

function generateICSFile(todo, followUpData) {
  const date = new Date(followUpData.dateTime);
  const endDate = new Date(date);
  endDate.setMinutes(endDate.getMinutes() + 15);
  
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const startDateStr = formatICSDate(date);
  const endDateStr = formatICSDate(endDate);
  const now = formatICSDate(new Date());
  
  const uid = `todo-${Date.now()}@todoapp.local`;
  
  const escapeICS = (text) => {
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

function openFollowUpActions(todoId) {
  const todo = todosMap.get(todoId);
  if (todo && todo.followUp) {
    generateICSFile(todo, todo.followUp);
  }
}

function formatDateTimeLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatFollowUpDate(dateTimeString) {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function checkIfOverdue(todo) {
  if (!todo.followUp || todo.completed) {
    return false;
  }
  const followUpDate = new Date(todo.followUp.dateTime);
  const now = new Date();
  return followUpDate < now;
}

function showNotesModal(todoId) {
  const todo = todosMap.get(todoId);
  if (!todo) return;
  
  const notesModal = document.getElementById('notes-modal');
  const notesContent = document.getElementById('notes-content');
  const notesTitle = document.getElementById('notes-title');
  
  if (!notesModal || !notesContent || !notesTitle) return;
  
  notesTitle.textContent = todo.text;
  
  if (todo.followUp && todo.followUp.notes) {
    notesContent.textContent = todo.followUp.notes;
    notesContent.style.display = 'block';
  } else {
    notesContent.textContent = 'No notes for this todo.';
    notesContent.style.display = 'block';
  }
  
  notesModal.classList.add('active');
}
