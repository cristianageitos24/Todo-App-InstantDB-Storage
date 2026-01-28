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

let allTodos = getTodos();
let currentTodoIndex = null; // Track which todo we're adding follow-up for

// Initialize todos list
try {
    updateTodoList();
} catch(e) {
    console.error('Error updating todo list:', e);
    allTodos = [];
}

// Add event listener to form submit
if(todoForm){
    todoForm.addEventListener('submit', function(e){
        e.preventDefault();
        addTodo();
    });
}

// Also add click listener to add button as backup
const addButton = document.getElementById('add-button');
if(addButton){
    addButton.addEventListener('click', function(e){
        e.preventDefault();
        addTodo();
    });
}

if(followupYesBtn){
followupYesBtn.addEventListener('click', function(){
    followupModal.classList.remove('active');
    followupFormModal.classList.add('active');
    // Set default date to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    document.getElementById('followup-date').value = formatDateTimeLocal(tomorrow);
});
}

if(followupNoBtn){
followupNoBtn.addEventListener('click', function(){
    followupModal.classList.remove('active');
    currentTodoIndex = null;
});
}

if(followupCancelBtn){
followupCancelBtn.addEventListener('click', function(){
    followupFormModal.classList.remove('active');
    currentTodoIndex = null;
    followupForm.reset();
});
}

if(followupForm){
followupForm.addEventListener('submit', function(e){
    e.preventDefault();
    createFollowUp();
});
}

// Close modals when clicking outside
if(followupModal){
followupModal.addEventListener('click', function(e){
    if(e.target === followupModal){
        followupModal.classList.remove('active');
        currentTodoIndex = null;
    }
});
}

if(followupFormModal){
followupFormModal.addEventListener('click', function(e){
    if(e.target === followupFormModal){
        followupFormModal.classList.remove('active');
        currentTodoIndex = null;
        followupForm.reset();
    }
});
}

// Notes modal handlers
if(notesCloseBtn){
    notesCloseBtn.addEventListener('click', function(){
        if(notesModal) notesModal.classList.remove('active');
    });
}

if(notesModal){
    notesModal.addEventListener('click', function(e){
        if(e.target === notesModal){
            notesModal.classList.remove('active');
        }
    });
}

function addTodo(){
    if(!todoInput) {
        console.error('Todo input not found!');
        return;
    }
    
    const todoText = todoInput.value.trim();
    if(todoText.length > 0){
        const todoObject = {
            text: todoText,
            completed: false,
            followUp: null,
            completedDate: null,
            createdDate: new Date().toISOString()
        }
        allTodos.push(todoObject);
        currentTodoIndex = allTodos.length - 1;
        updateTodoList();
        saveTodos();
        todoInput.value = "";
        
        // Show follow-up prompt
        if(followupModal){
            followupModal.classList.add('active');
        }
    }  
}
function updateTodoList(){
    // Sort todos: uncompleted first (most recent first), then completed (most recent first)
    const sortedTodos = [...allTodos].sort((a, b) => {
        // If one is completed and the other isn't, uncompleted comes first
        if(a.completed && !b.completed) return 1;
        if(!a.completed && b.completed) return -1;
        
        // If both are completed, sort by completedDate (most recent first)
        if(a.completed && b.completed) {
            const dateA = a.completedDate ? new Date(a.completedDate) : new Date(0);
            const dateB = b.completedDate ? new Date(b.completedDate) : new Date(0);
            return dateB - dateA; // Most recent first
        }
        
        // Both uncompleted - sort by createdDate (most recent first)
        if(!a.completed && !b.completed) {
            const dateA = a.createdDate ? new Date(a.createdDate) : new Date(0);
            const dateB = b.createdDate ? new Date(b.createdDate) : new Date(0);
            return dateB - dateA; // Most recent first
        }
        
        return 0;
    });
    
    todoListUL.innerHTML = "";
    sortedTodos.forEach((todo, displayIndex)=>{
        // Find original index in allTodos array
        const originalIndex = allTodos.indexOf(todo);
        const todoItem = createTodoItem(todo, originalIndex);
        todoListUL.append(todoItem);
    })
}
function createTodoItem(todo, todoIndex){
    const todoId = "todo-"+todoIndex;
    const todoLI = document.createElement("li");
    const todoText = todo.text;
    
    // Check if todo is overdue (has follow-up date that passed and not completed)
    const isOverdue = checkIfOverdue(todo);
    todoLI.className = isOverdue ? "todo overdue" : "todo";
    
    // Add follow-up indicator if exists
    const hasNotes = todo.followUp && todo.followUp.notes && todo.followUp.notes.trim().length > 0;
    const followUpIndicator = todo.followUp ? 
        `<span class="followup-indicator" title="Follow-up: ${formatFollowUpDate(todo.followUp.dateTime)}">
            📅 ${formatFollowUpDate(todo.followUp.dateTime)}${hasNotes ? ' <span class="view-notes-text">· view notes</span>' : ''}
        </span>` : '';
    
    todoLI.innerHTML = `
        <input type="checkbox" id="${todoId}">
        <label class="custom-checkbox" for="${todoId}">
            <svg fill="transparent" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
        </label>
        <span class="todo-text" data-todo-index="${todoIndex}">
            ${todoText}
            ${followUpIndicator}
        </span>
        ${todo.followUp ? `<button class="followup-actions" title="Download calendar event">
            <svg fill="var(--accent-color)" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Zm300 230q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/></svg>
        </button>` : ''}
        <button class="delete-button">
            <svg fill="var(--secondary-color)" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
        </button>
    `
    const deleteButton = todoLI.querySelector(".delete-button");
    deleteButton.addEventListener("click", (e)=>{
        e.stopPropagation();
        deleteTodoItem(todoIndex);
    })
    
    // Add follow-up actions button if exists
    if(todo.followUp){
        const followUpBtn = todoLI.querySelector(".followup-actions");
        if(followUpBtn){
            followUpBtn.addEventListener("click", (e)=>{
                e.stopPropagation();
                openFollowUpActions(todoIndex);
            })
        }
    }
    
    // Make todo text clickable to show notes
    const todoTextElement = todoLI.querySelector(".todo-text");
    todoTextElement.addEventListener("click", (e)=>{
        e.stopPropagation();
        showNotesModal(todoIndex);
    });
    
    const checkbox = todoLI.querySelector("input[type='checkbox']");
    if(checkbox){
        checkbox.addEventListener("change", ()=>{
            allTodos[todoIndex].completed = checkbox.checked;
            // Track when item was completed/uncompleted
            if(checkbox.checked){
                allTodos[todoIndex].completedDate = new Date().toISOString();
            } else {
                allTodos[todoIndex].completedDate = null;
            }
            saveTodos();
            updateTodoList(); // Refresh to update overdue status and sorting
        })
        checkbox.checked = todo.completed;
    }
    return todoLI;
}
function deleteTodoItem(todoIndex){
    allTodos = allTodos.filter((_, i)=> i !== todoIndex);
    saveTodos();
    updateTodoList();
}
function saveTodos(){
    const todosJson = JSON.stringify(allTodos);
    localStorage.setItem("todos", todosJson);
}
function getTodos(){
    const todos = localStorage.getItem("todos") || "[]";
    const parsedTodos = JSON.parse(todos);
    // Add createdDate to existing todos that don't have it (for backward compatibility)
    parsedTodos.forEach(todo => {
        if(!todo.createdDate) {
            todo.createdDate = new Date().toISOString();
        }
    });
    return parsedTodos;
}

function createFollowUp(){
    const dateTime = document.getElementById('followup-date').value;
    const notes = document.getElementById('followup-notes').value;
    
    if(!dateTime){
        alert('Please select a date and time');
        return;
    }
    
    const followUpData = {
        dateTime: dateTime,
        notes: notes || ''
    };
    
    // Store follow-up with the current todo
    if(currentTodoIndex !== null && allTodos[currentTodoIndex]){
        allTodos[currentTodoIndex].followUp = followUpData;
        saveTodos();
        updateTodoList();
    }
    
    // Generate and download .ics file
    generateICSFile(allTodos[currentTodoIndex], followUpData);
    
    // Close modal and reset
    followupFormModal.classList.remove('active');
    followupForm.reset();
    currentTodoIndex = null;
}

function generateICSFile(todo, followUpData){
    const date = new Date(followUpData.dateTime);
    const endDate = new Date(date);
    endDate.setMinutes(endDate.getMinutes() + 15); // 15 minutes duration
    
    // Format dates in ICS format (YYYYMMDDTHHMMSS)
    const formatICSDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const startDateStr = formatICSDate(date);
    const endDateStr = formatICSDate(endDate);
    const now = formatICSDate(new Date());
    
    // Create unique ID
    const uid = `todo-${Date.now()}@todoapp.local`;
    
    // Escape text for ICS format
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
    
    // Create blob and download
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

function openFollowUpActions(todoIndex){
    const todo = allTodos[todoIndex];
    if(todo.followUp){
        // Regenerate ICS file
        generateICSFile(todo, todo.followUp);
    }
}

function formatDateTimeLocal(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatFollowUpDate(dateTimeString){
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function checkIfOverdue(todo){
    if(!todo.followUp || todo.completed){
        return false;
    }
    const followUpDate = new Date(todo.followUp.dateTime);
    const now = new Date();
    return followUpDate < now;
}

function showNotesModal(todoIndex){
    const todo = allTodos[todoIndex];
    const notesModal = document.getElementById('notes-modal');
    const notesContent = document.getElementById('notes-content');
    const notesTitle = document.getElementById('notes-title');
    
    notesTitle.textContent = todo.text;
    
    if(todo.followUp && todo.followUp.notes){
        notesContent.textContent = todo.followUp.notes;
        notesContent.style.display = 'block';
    } else {
        notesContent.textContent = 'No notes for this todo.';
        notesContent.style.display = 'block';
    }
    
    notesModal.classList.add('active');
}