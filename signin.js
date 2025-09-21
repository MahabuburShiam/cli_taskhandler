const bcrypt = require('bcrypt');
const { UserData } = require('./UserData');

const userData = new UserData();

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

// Simple Task Management System with JSON file storage
class SimpleTaskManager {
  constructor(username) {
    this.username = username;
    this.tasksFile = `tasks_${username}.json`;
    this.historyFile = `history_${username}.json`;
    this.tasks = [];
    this.history = [];
    this.undoStack = [];
    this.redoStack = [];
    this.loadTasks();
    this.loadHistory();
  }

  // Load tasks from JSON file
  loadTasks() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.tasksFile)) {
        const data = fs.readFileSync(this.tasksFile, 'utf8');
        this.tasks = JSON.parse(data);
        console.log(colors.blue + `📁 Loaded ${this.tasks.length} tasks from ${this.tasksFile}` + colors.reset);
      } else {
        this.tasks = [];
        this.saveTasks(); // Create empty file
        console.log(colors.yellow + `📁 Created new task file: ${this.tasksFile}` + colors.reset);
      }
    } catch (error) {
      console.log(colors.red + `❌ Error loading tasks: ${error.message}` + colors.reset);
      this.tasks = [];
    }
  }

  // Save tasks to JSON file
  saveTasks() {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
      console.log(colors.green + `💾 Tasks saved to ${this.tasksFile}` + colors.reset);
    } catch (error) {
      console.log(colors.red + `❌ Error saving tasks: ${error.message}` + colors.reset);
      throw new Error('Failed to save tasks to file');
    }
  }

  // Load history from JSON file
  loadHistory() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.history = JSON.parse(data);
      } else {
        this.history = [];
        this.saveHistory(); // Create empty file
      }
    } catch (error) {
      console.log(colors.red + `❌ Error loading history: ${error.message}` + colors.reset);
      this.history = [];
    }
  }

  // Save history to JSON file
  saveHistory() {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.log(colors.red + `❌ Error saving history: ${error.message}` + colors.reset);
    }
  }

  createTask(title, description = '') {
    const task = {
      id: Date.now(),
      title,
      description,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    
    this.tasks.push(task);
    this.addToHistory('CREATE', `Created task: "${title}"`);
    this.saveTasks(); // Save to file
    return task;
  }

  removeTask(id) {
    const index = this.tasks.findIndex(t => t.id == id);
    if (index === -1) throw new Error('Task not found');
    
    const task = this.tasks[index];
    this.tasks.splice(index, 1);
    this.addToHistory('REMOVE', `Removed task: "${task.title}"`);
    this.saveTasks(); // Save to file
    return task;
  }

  completeTask(id) {
    const task = this.tasks.find(t => t.id == id);
    if (!task) throw new Error('Task not found');
    
    const wasCompleted = task.completed;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    
    const action = task.completed ? 'COMPLETE' : 'UNCOMPLETE';
    const details = `${task.completed ? 'Completed' : 'Uncompleted'} task: "${task.title}"`;
    this.addToHistory(action, details);
    this.saveTasks(); // Save to file
    
    return task;
  }

  addToHistory(action, details) {
    const historyItem = {
      action,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.history.push(historyItem);
    this.saveHistory(); // Save history to file
    
    this.undoStack.push({
      ...historyItem, 
      taskState: JSON.parse(JSON.stringify(this.tasks))
    });
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length < 2) throw new Error('Nothing to undo');
    
    // Move current state to redo stack before undoing
    const currentState = this.undoStack.pop();
    this.redoStack.push({
      ...currentState,
      taskState: JSON.parse(JSON.stringify(this.tasks))
    });
    
    const previousState = this.undoStack[this.undoStack.length - 1];
    this.tasks = JSON.parse(JSON.stringify(previousState.taskState));
    this.saveTasks(); // Save to file
    
    return currentState;
  }

  redo() {
    if (this.redoStack.length === 0) throw new Error('Nothing to redo');
    
    const actionToRedo = this.redoStack.pop();
    
    // Restore the state that was undone
    this.tasks = JSON.parse(JSON.stringify(actionToRedo.taskState));
    this.saveTasks(); // Save to file
    
    // Move back to undo stack
    this.undoStack.push(actionToRedo);
    
    return actionToRedo;
  }

  getAllTasks() {
    return this.tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  getPendingTasks() {
    return this.tasks.filter(task => !task.completed);
  }

  getCompletedTasks() {
    return this.tasks.filter(task => task.completed);
  }

  getHistory() {
    return this.history;
  }

  // Search task by number (position in list)
  searchTaskByNumber(taskNumber) {
    const allTasks = this.getAllTasks();
    const index = parseInt(taskNumber) - 1;
    
    if (index < 0 || index >= allTasks.length) {
      throw new Error(`Task number ${taskNumber} not found. You have ${allTasks.length} tasks.`);
    }
    
    return {
      task: allTasks[index],
      position: taskNumber,
      totalTasks: allTasks.length
    };
  }
}

// Function to hide password input
function hidePasswordInput(rl, prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let password = '';
    
    process.stdout.write(prompt);
    
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          // Restore readline interface
          stdin.setRawMode(false);
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    stdin.on('data', onData);
  });
}

// Dashboard function
function showDashboard(user, rl, callback) {
  const taskManager = new SimpleTaskManager(user.username);
  
  function displayDashboard() {
    console.clear();
    console.log(colors.cyan + '🎯 ====================================' + colors.reset);
    console.log(colors.bright + '     Welcome To Dashboard' + colors.reset);
    console.log(colors.cyan + '🎯 ====================================' + colors.reset);
    console.log(colors.blue + `👤 User: ${user.username}` + colors.reset);
    console.log(colors.blue + `📧 Email: ${user.email}` + colors.reset);
    console.log(colors.blue + `📅 Login Time: ${new Date().toLocaleString()}` + colors.reset);
    console.log(colors.cyan + '====================================' + colors.reset);
    console.log('');
    
    // Show tasks with colors
    const allTasks = taskManager.getAllTasks();
    const pendingTasks = taskManager.getPendingTasks();
    const completedTasks = taskManager.getCompletedTasks();
    
    console.log(colors.yellow + '📝 YOUR TASKS:' + colors.reset);
    console.log(colors.yellow + '--------------------' + colors.reset);
    
    if (allTasks.length === 0) {
      console.log(colors.magenta + '   No tasks yet. Create your first task!' + colors.reset);
    } else {
      console.log(colors.red + `📌 PENDING TASKS (${pendingTasks.length}):` + colors.reset);
      if (pendingTasks.length === 0) {
        console.log(colors.red + '   No pending tasks' + colors.reset);
      } else {
        pendingTasks.forEach((task, index) => {
          console.log(colors.red + `${index + 1}. ⏳ ${task.title}` + colors.reset);
          if (task.description) {
            console.log(colors.red + `   📄 ${task.description}` + colors.reset);
          }
          console.log(colors.red + `   📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
          console.log('');
        });
      }
      
      console.log(colors.green + `✅ COMPLETED TASKS (${completedTasks.length}):` + colors.reset);
      if (completedTasks.length === 0) {
        console.log(colors.green + '   No completed tasks yet' + colors.reset);
      } else {
        completedTasks.forEach((task, index) => {
          console.log(colors.green + `${index + 1}. ✅ ${task.title}` + colors.reset);
          if (task.description) {
            console.log(colors.green + `   📄 ${task.description}` + colors.reset);
          }
          console.log(colors.green + `   📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
          console.log(colors.green + `   ✅ Completed: ${new Date(task.completedAt).toLocaleString()}` + colors.reset);
          console.log('');
        });
      }
    }
    console.log(colors.yellow + '--------------------' + colors.reset);
    
    // Show menu
    console.log(colors.cyan + '\n🔧 DASHBOARD MENU:' + colors.reset);
    console.log('1. Create Task');
    console.log('2. Complete Task');
    console.log('3. Remove Task');
    console.log('4. View All Tasks');
    console.log('5. Undo Last Action');
    console.log('6. Redo Last Action');
    console.log('7. Search Task by Number');
    console.log('8. View Task History');
    console.log('9. Refresh Dashboard');
    console.log('10. Logout');
    console.log(colors.cyan + '========================' + colors.reset);
  }

  function showMenu() {
    displayDashboard();
    
    // Ensure readline interface is ready
    process.nextTick(() => {
      rl.question(colors.yellow + '\nChoose an option (1-10): ' + colors.reset, handleChoice);
    });
  }

  function handleChoice(choice) {
    const selectedChoice = choice.trim();
    console.log(`Debug: You selected option: "${selectedChoice}"`); // Debug line
    
    switch (selectedChoice) {
      case '1':
        console.log('Creating task...'); // Debug line
        createTask();
        break;

      case '2':
        console.log('Completing task...'); // Debug line
        completeTask();
        break;

      case '3':
        console.log('Removing task...'); // Debug line
        removeTask();
        break;

      case '4':
        console.log('Viewing all tasks...'); // Debug line
        viewAllTasks();
        break;

      case '5':
        console.log('Undoing action...'); // Debug line
        undoLastAction();
        break;

      case '6':
        console.log('Redoing action...'); // Debug line
        redoLastAction();
        break;

      case '7':
        console.log('Searching task...'); // Debug line
        searchTask();
        break;

      case '8':
        console.log('Viewing history...'); // Debug line
        viewHistory();
        break;

      case '9':
        console.log('Refreshing dashboard...'); // Debug line
        showMenu();
        break;

      case '10':
        console.log('Logging out...'); // Debug line
        logout();
        break;

      default:
        console.log(colors.red + `❌ Invalid choice: "${selectedChoice}". Please select 1-10.` + colors.reset);
        setTimeout(() => showMenu(), 1500);
        break;
    }
  }

  function createTask() {
    console.log(colors.cyan + '\n📝 CREATE NEW TASK' + colors.reset);
    console.log('-------------------');
    
    rl.question('Enter task title: ', (title) => {
      if (!title.trim()) {
        console.log(colors.red + '❌ Task title cannot be empty.' + colors.reset);
        setTimeout(() => showMenu(), 1500);
        return;
      }
      
      rl.question('Enter task description (optional, press Enter to skip): ', (description) => {
        try {
          const task = taskManager.createTask(title.trim(), description.trim());
          console.log(colors.green + `✅ Task "${task.title}" created successfully!` + colors.reset);
          console.log(colors.blue + `📅 Created at: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
          console.log(colors.red + '📌 Status: PENDING' + colors.reset);
          console.log(colors.blue + `💾 Saved to file: tasks_${taskManager.username}.json` + colors.reset);
          
          setTimeout(() => showMenu(), 3000);
        } catch (error) {
          console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
          setTimeout(() => showMenu(), 2000);
        }
      });
    });
  }

  function completeTask() {
    const pendingTasks = taskManager.getPendingTasks();
    
    if (pendingTasks.length === 0) {
      console.log(colors.red + '\n❌ No pending tasks to complete.' + colors.reset);
      setTimeout(() => showMenu(), 1500);
      return;
    }
    
    console.log(colors.cyan + '\n✅ SELECT TASK TO COMPLETE:' + colors.reset);
    console.log('----------------------------');
    
    pendingTasks.forEach((task, index) => {
      console.log(colors.red + `${index + 1}. ⏳ ${task.title}` + colors.reset);
      console.log(colors.blue + `   📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
    });
    
    rl.question(colors.yellow + '\nEnter task number to complete: ' + colors.reset, (input) => {
      const taskIndex = parseInt(input) - 1;
      
      if (taskIndex >= 0 && taskIndex < pendingTasks.length) {
        try {
          const completedTask = taskManager.completeTask(pendingTasks[taskIndex].id);
          console.log(colors.green + `✅ Task "${completedTask.title}" completed successfully!` + colors.reset);
          console.log(colors.green + `📅 Completed at: ${new Date(completedTask.completedAt).toLocaleString()}` + colors.reset);
          console.log(colors.green + '🎉 Great job!' + colors.reset);
          console.log(colors.blue + `💾 Changes saved to file: tasks_${taskManager.username}.json` + colors.reset);
          
          setTimeout(() => showMenu(), 3000);
        } catch (error) {
          console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
          setTimeout(() => showMenu(), 2000);
        }
      } else {
        console.log(colors.red + '❌ Invalid task number.' + colors.reset);
        setTimeout(() => showMenu(), 1500);
      }
    });
  }

  function removeTask() {
    const allTasks = taskManager.getAllTasks();
    
    if (allTasks.length === 0) {
      console.log(colors.red + '\n❌ No tasks to remove.' + colors.reset);
      setTimeout(() => showMenu(), 1500);
      return;
    }
    
    console.log(colors.cyan + '\n🗑️ SELECT TASK TO REMOVE:' + colors.reset);
    console.log('-------------------------');
    
    allTasks.forEach((task, index) => {
      const statusColor = task.completed ? colors.green : colors.red;
      const statusIcon = task.completed ? '✅' : '⏳';
      console.log(statusColor + `${index + 1}. ${statusIcon} ${task.title}` + colors.reset);
    });
    
    rl.question(colors.yellow + '\nEnter task number to remove: ' + colors.reset, (input) => {
      const taskIndex = parseInt(input) - 1;
      
      if (taskIndex >= 0 && taskIndex < allTasks.length) {
        const taskToRemove = allTasks[taskIndex];
        
        rl.question(colors.yellow + `Are you sure you want to remove "${taskToRemove.title}"? (y/n): ` + colors.reset, (confirm) => {
          if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            try {
              const removedTask = taskManager.removeTask(taskToRemove.id);
              console.log(colors.green + `🗑️ Task "${removedTask.title}" removed successfully!` + colors.reset);
              console.log(colors.blue + `📅 Removed at: ${new Date().toLocaleString()}` + colors.reset);
              console.log(colors.blue + `💾 Changes saved to file: tasks_${taskManager.username}.json` + colors.reset);
              
              setTimeout(() => showMenu(), 2500);
            } catch (error) {
              console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
              setTimeout(() => showMenu(), 2000);
            }
          } else {
            console.log(colors.yellow + '❌ Removal cancelled.' + colors.reset);
            setTimeout(() => showMenu(), 1500);
          }
        });
      } else {
        console.log(colors.red + '❌ Invalid task number.' + colors.reset);
        setTimeout(() => showMenu(), 1500);
      }
    });
  }

  function viewAllTasks() {
    const allTasks = taskManager.getAllTasks();
    const pendingTasks = taskManager.getPendingTasks();
    const completedTasks = taskManager.getCompletedTasks();
    
    console.clear();
    console.log(colors.cyan + '📋 ALL TASKS OVERVIEW' + colors.reset);
    console.log(colors.cyan + '=====================' + colors.reset);
    
    if (allTasks.length === 0) {
      console.log(colors.yellow + '📝 No tasks found.' + colors.reset);
      console.log(colors.blue + '💡 Create your first task using option 1!' + colors.reset);
    } else {
      // Task statistics
      console.log(colors.blue + '📊 TASK STATISTICS:' + colors.reset);
      console.log(colors.white + `   Total Tasks: ${allTasks.length}` + colors.reset);
      console.log(colors.red + `   Pending: ${pendingTasks.length}` + colors.reset);
      console.log(colors.green + `   Completed: ${completedTasks.length}` + colors.reset);
      
      if (allTasks.length > 0) {
        const completionRate = Math.round((completedTasks.length / allTasks.length) * 100);
        console.log(colors.magenta + `   Completion Rate: ${completionRate}%` + colors.reset);
      }
      
      console.log('');
      
      // Show all tasks in chronological order
      console.log(colors.yellow + '📝 ALL TASKS (Chronological Order):' + colors.reset);
      console.log(colors.yellow + '====================================' + colors.reset);
      
      allTasks.forEach((task, index) => {
        const statusColor = task.completed ? colors.green : colors.red;
        const statusIcon = task.completed ? '✅' : '⏳';
        const statusText = task.completed ? 'COMPLETED' : 'PENDING';
        
        console.log(statusColor + `${index + 1}. ${statusIcon} ${task.title}` + colors.reset);
        
        if (task.description && task.description.trim()) {
          console.log(colors.white + `   📄 ${task.description}` + colors.reset);
        }
        
        console.log(colors.blue + `   🆔 ID: ${task.id}` + colors.reset);
        console.log(colors.blue + `   📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
        
        if (task.completed && task.completedAt) {
          console.log(colors.green + `   ✅ Completed: ${new Date(task.completedAt).toLocaleString()}` + colors.reset);
          
          // Calculate time to complete
          const createdTime = new Date(task.createdAt);
          const completedTime = new Date(task.completedAt);
          const timeDiff = completedTime - createdTime;
          const minutes = Math.floor(timeDiff / (1000 * 60));
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          
          let timeToComplete = '';
          if (days > 0) timeToComplete = `${days} day(s), ${hours % 24} hour(s)`;
          else if (hours > 0) timeToComplete = `${hours} hour(s), ${minutes % 60} minute(s)`;
          else timeToComplete = `${minutes} minute(s)`;
          
          console.log(colors.magenta + `   ⏱️  Time to complete: ${timeToComplete}` + colors.reset);
        }
        
        console.log(''); // Empty line between tasks
      });
      
      // Show quick actions
      console.log(colors.cyan + '🔧 QUICK ACTIONS:' + colors.reset);
      console.log(colors.green + 'c + [number] - Complete task (e.g., c 1)' + colors.reset);
      console.log(colors.red + 'r + [number] - Remove task (e.g., r 2)' + colors.reset);
      console.log(colors.blue + 's + [number] - Search/View task details (e.g., s 3)' + colors.reset);
      console.log(colors.yellow + 'f - Filter tasks (pending/completed)' + colors.reset);
      console.log(colors.white + 'b - Back to dashboard' + colors.reset);
    }
    
    rl.question(colors.yellow + '\nEnter action or press Enter to go back: ' + colors.reset, (input) => {
      const action = input.trim().toLowerCase();
      
      if (!action || action === 'b') {
        showMenu();
        return;
      }
      
      // Handle quick actions
      if (action.startsWith('c ')) {
        // Complete task
        const taskNumber = action.substring(2).trim();
        const taskIndex = parseInt(taskNumber) - 1;
        
        if (taskIndex >= 0 && taskIndex < allTasks.length && !allTasks[taskIndex].completed) {
          try {
            const completedTask = taskManager.completeTask(allTasks[taskIndex].id);
            console.log(colors.green + `✅ Task "${completedTask.title}" completed!` + colors.reset);
            setTimeout(() => viewAllTasks(), 2000);
          } catch (error) {
            console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
            setTimeout(() => viewAllTasks(), 2000);
          }
        } else {
          console.log(colors.red + '❌ Invalid task number or task already completed.' + colors.reset);
          setTimeout(() => viewAllTasks(), 1500);
        }
      } else if (action.startsWith('r ')) {
        // Remove task
        const taskNumber = action.substring(2).trim();
        const taskIndex = parseInt(taskNumber) - 1;
        
        if (taskIndex >= 0 && taskIndex < allTasks.length) {
          rl.question(colors.yellow + `Remove "${allTasks[taskIndex].title}"? (y/n): ` + colors.reset, (confirm) => {
            if (confirm.toLowerCase() === 'y') {
              try {
                const removedTask = taskManager.removeTask(allTasks[taskIndex].id);
                console.log(colors.green + `🗑️ Task "${removedTask.title}" removed!` + colors.reset);
                setTimeout(() => viewAllTasks(), 2000);
              } catch (error) {
                console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
                setTimeout(() => viewAllTasks(), 2000);
              }
            } else {
              setTimeout(() => viewAllTasks(), 500);
            }
          });
        } else {
          console.log(colors.red + '❌ Invalid task number.' + colors.reset);
          setTimeout(() => viewAllTasks(), 1500);
        }
      } else if (action.startsWith('s ')) {
        // Search/View task details
        const taskNumber = action.substring(2).trim();
        try {
          const searchResult = taskManager.searchTaskByNumber(taskNumber);
          // Show detailed view (reuse search functionality)
          console.log(colors.green + `🔍 Showing details for task #${taskNumber}` + colors.reset);
          setTimeout(() => {
            // Simulate search selection
            searchTask();
          }, 1000);
        } catch (error) {
          console.log(colors.red + `❌ ${error.message}` + colors.reset);
          setTimeout(() => viewAllTasks(), 1500);
        }
      } else if (action === 'f') {
        // Filter tasks
        console.log(colors.cyan + '\n📋 FILTER TASKS:' + colors.reset);
        console.log('1. Show only pending tasks');
        console.log('2. Show only completed tasks');
        console.log('3. Show all tasks');
        
        rl.question(colors.yellow + 'Choose filter (1-3): ' + colors.reset, (filter) => {
          switch (filter.trim()) {
            case '1':
              showFilteredTasks('pending');
              break;
            case '2':
              showFilteredTasks('completed');
              break;
            case '3':
            default:
              viewAllTasks();
              break;
          }
        });
      } else {
        console.log(colors.red + '❌ Invalid action. Use format: c 1, r 2, s 3, f, or b' + colors.reset);
        setTimeout(() => viewAllTasks(), 2000);
      }
    });
  }

  function showFilteredTasks(filter) {
    const allTasks = taskManager.getAllTasks();
    let filteredTasks = [];
    let title = '';
    
    if (filter === 'pending') {
      filteredTasks = taskManager.getPendingTasks();
      title = '🔴 PENDING TASKS';
    } else if (filter === 'completed') {
      filteredTasks = taskManager.getCompletedTasks();
      title = '🟢 COMPLETED TASKS';
    }
    
    console.clear();
    console.log(colors.cyan + title + colors.reset);
    console.log(colors.cyan + '==================' + colors.reset);
    
    if (filteredTasks.length === 0) {
      console.log(colors.yellow + `No ${filter} tasks found.` + colors.reset);
    } else {
      filteredTasks.forEach((task, index) => {
        const statusColor = task.completed ? colors.green : colors.red;
        const statusIcon = task.completed ? '✅' : '⏳';
        
        console.log(statusColor + `${index + 1}. ${statusIcon} ${task.title}` + colors.reset);
        if (task.description) {
          console.log(colors.white + `   📄 ${task.description}` + colors.reset);
        }
        console.log(colors.blue + `   📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
        if (task.completed && task.completedAt) {
          console.log(colors.green + `   ✅ Completed: ${new Date(task.completedAt).toLocaleString()}` + colors.reset);
        }
        console.log('');
      });
    }
    
    rl.question(colors.yellow + '\nPress Enter to return to all tasks view...' + colors.reset, () => {
      viewAllTasks();
    });
  }

  function undoLastAction() {
    try {
      const undoAction = taskManager.undo();
      console.log(colors.green + `↩️ Undone: ${undoAction.details}` + colors.reset);
      console.log(colors.blue + `📅 Original action time: ${new Date(undoAction.timestamp).toLocaleString()}` + colors.reset);
      console.log(colors.blue + `📅 Undone at: ${new Date().toLocaleString()}` + colors.reset);
      
      setTimeout(() => showMenu(), 2500);
    } catch (error) {
      console.log(colors.red + `❌ ${error.message}` + colors.reset);
      setTimeout(() => showMenu(), 1500);
    }
  }

  function redoLastAction() {
    try {
      const redoAction = taskManager.redo();
      console.log(colors.green + `↪️ Redone: ${redoAction.details}` + colors.reset);
      console.log(colors.blue + `📅 Original action time: ${new Date(redoAction.timestamp).toLocaleString()}` + colors.reset);
      console.log(colors.blue + `📅 Redone at: ${new Date().toLocaleString()}` + colors.reset);
      
      setTimeout(() => showMenu(), 2500);
    } catch (error) {
      console.log(colors.red + `❌ ${error.message}` + colors.reset);
      setTimeout(() => showMenu(), 1500);
    }
  }

  function searchTask() {
    const allTasks = taskManager.getAllTasks();
    
    if (allTasks.length === 0) {
      console.log(colors.red + '\n❌ No tasks available to search.' + colors.reset);
      setTimeout(() => showMenu(), 1500);
      return;
    }
    
    console.log(colors.cyan + '\n🔍 SEARCH TASK BY NUMBER' + colors.reset);
    console.log('---------------------------');
    console.log(colors.blue + `📊 You have ${allTasks.length} task(s) total` + colors.reset);
    
    // Show task numbers preview
    console.log(colors.yellow + '\nTask Numbers:' + colors.reset);
    allTasks.forEach((task, index) => {
      const statusColor = task.completed ? colors.green : colors.red;
      const statusIcon = task.completed ? '✅' : '⏳';
      console.log(statusColor + `${index + 1}. ${statusIcon} ${task.title.substring(0, 30)}${task.title.length > 30 ? '...' : ''}` + colors.reset);
    });
    
    rl.question(colors.yellow + `\nEnter task number (1-${allTasks.length}): ` + colors.reset, (input) => {
      try {
        const searchResult = taskManager.searchTaskByNumber(input.trim());
        const task = searchResult.task;
        
        console.clear();
        console.log(colors.cyan + '🔍 SEARCH RESULT' + colors.reset);
        console.log(colors.cyan + '================' + colors.reset);
        
        // Display detailed task information
        const statusColor = task.completed ? colors.green : colors.red;
        const statusIcon = task.completed ? '✅ COMPLETED' : '⏳ PENDING';
        const statusText = task.completed ? 'COMPLETED' : 'PENDING';
        
        console.log(colors.blue + `📍 Task #${searchResult.position} of ${searchResult.totalTasks}` + colors.reset);
        console.log(colors.bright + `📝 Title: ${task.title}` + colors.reset);
        
        if (task.description && task.description.trim()) {
          console.log(colors.white + `📄 Description: ${task.description}` + colors.reset);
        }
        
        console.log(statusColor + `📌 Status: ${statusIcon}` + colors.reset);
        console.log(colors.yellow + `🆔 Task ID: ${task.id}` + colors.reset);
        console.log(colors.blue + `📅 Created: ${new Date(task.createdAt).toLocaleString()}` + colors.reset);
        
        if (task.completed && task.completedAt) {
          console.log(colors.green + `✅ Completed: ${new Date(task.completedAt).toLocaleString()}` + colors.reset);
          
          // Calculate completion time
          const createdTime = new Date(task.createdAt);
          const completedTime = new Date(task.completedAt);
          const timeDiff = completedTime - createdTime;
          const minutes = Math.floor(timeDiff / (1000 * 60));
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          
          let timeToComplete = '';
          if (days > 0) timeToComplete = `${days} day(s)`;
          else if (hours > 0) timeToComplete = `${hours} hour(s)`;
          else timeToComplete = `${minutes} minute(s)`;
          
          console.log(colors.magenta + `⏱️  Time to complete: ${timeToComplete}` + colors.reset);
        }
        
        console.log('');
        console.log(colors.cyan + '📋 QUICK ACTIONS:' + colors.reset);
        if (!task.completed) {
          console.log(colors.green + 'c - Complete this task' + colors.reset);
        }
        console.log(colors.red + 'r - Remove this task' + colors.reset);
        console.log(colors.blue + 'b - Back to dashboard' + colors.reset);
        
        rl.question(colors.yellow + '\nChoose an action (c/r/b) or press Enter to go back: ' + colors.reset, (action) => {
          const selectedAction = action.trim().toLowerCase();
          
          switch (selectedAction) {
            case 'c':
              if (!task.completed) {
                try {
                  const completedTask = taskManager.completeTask(task.id);
                  console.log(colors.green + `✅ Task "${completedTask.title}" completed successfully!` + colors.reset);
                  console.log(colors.green + `📅 Completed at: ${new Date(completedTask.completedAt).toLocaleString()}` + colors.reset);
                  setTimeout(() => showMenu(), 2000);
                } catch (error) {
                  console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
                  setTimeout(() => showMenu(), 2000);
                }
              } else {
                console.log(colors.yellow + '⚠️  Task is already completed.' + colors.reset);
                setTimeout(() => showMenu(), 1500);
              }
              break;
              
            case 'r':
              rl.question(colors.yellow + `Are you sure you want to remove "${task.title}"? (y/n): ` + colors.reset, (confirm) => {
                if (confirm.toLowerCase() === 'y') {
                  try {
                    const removedTask = taskManager.removeTask(task.id);
                    console.log(colors.green + `🗑️ Task "${removedTask.title}" removed successfully!` + colors.reset);
                    setTimeout(() => showMenu(), 2000);
                  } catch (error) {
                    console.log(colors.red + `❌ Error: ${error.message}` + colors.reset);
                    setTimeout(() => showMenu(), 2000);
                  }
                } else {
                  console.log(colors.yellow + '❌ Removal cancelled.' + colors.reset);
                  setTimeout(() => showMenu(), 1500);
                }
              });
              break;
              
            case 'b':
            case '':
            default:
              showMenu();
              break;
          }
        });
        
      } catch (error) {
        console.log(colors.red + `❌ ${error.message}` + colors.reset);
        setTimeout(() => showMenu(), 2000);
      }
    });
  }

  function viewHistory() {
    const history = taskManager.getHistory();
    
    console.clear();
    console.log(colors.cyan + '📜 ACTION HISTORY' + colors.reset);
    console.log(colors.cyan + '=================' + colors.reset);
    
    if (history.length === 0) {
      console.log(colors.yellow + 'No actions performed yet.' + colors.reset);
    } else {
      console.log(colors.blue + `Total actions: ${history.length}` + colors.reset);
      console.log('');
      
      history.slice(-10).reverse().forEach((action, index) => {
        let actionColor = colors.white;
        if (action.action === 'CREATE') actionColor = colors.blue;
        if (action.action === 'COMPLETE') actionColor = colors.green;
        if (action.action === 'REMOVE') actionColor = colors.red;
        
        console.log(actionColor + `${index + 1}. ${action.details}` + colors.reset);
        console.log(colors.yellow + `   📅 ${new Date(action.timestamp).toLocaleString()}` + colors.reset);
        console.log('');
      });
    }
    
    rl.question(colors.yellow + '\nPress Enter to return to dashboard...' + colors.reset, () => {
      showMenu();
    });
  }

  function logout() {
    console.log(colors.cyan + '\n👋 Logging out... Returning to main menu.' + colors.reset);
    console.log(colors.blue + `📅 Session ended at: ${new Date().toLocaleString()}` + colors.reset);
    setTimeout(() => callback(), 2000);
  }

  // Start the dashboard
  showMenu();
}

function signin(rl, callback) {
  rl.question('Enter username or email: ', (identifier) => {
    if (!identifier.trim()) {
      console.log('❌ Username/email cannot be empty.');
      return callback();
    }

    // Temporarily disable password hiding for testing
    console.log('Note: Password will be visible (for debugging)');
    rl.question('Enter password: ', (password) => {
      if (!password.trim()) {
        console.log('❌ Password cannot be empty.');
        return callback();
      }

      // Find user by username or email
      const user = userData.findUser(identifier.trim());
      
      if (!user) {
        console.log('❌ Invalid username/email or password.');
        return callback();
      }

      // Compare password with hashed password
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
          console.log('❌ Error during sign in. Please try again.');
          return callback();
        }

        if (result) {
          console.log(colors.green + '✅ Sign in successful!' + colors.reset);
          
          // Update last login
          userData.updateLastLogin(user.username);
          
          // Show dashboard with correct user info
          setTimeout(() => {
            showDashboard(user, rl, callback);
          }, 1000);
        } else {
          console.log('❌ Invalid username/email or password.');
          callback();
        }
      });
    });
  });
}

module.exports = { signin };