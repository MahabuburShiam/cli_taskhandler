const fs = require('fs');
const path = require('path');

class TaskManager {
  constructor(username) {
    this.username = username;
    this.tasksFile = path.join(__dirname, `tasks_${username}.json`);
    this.historyFile = path.join(__dirname, `history_${username}.json`);
    this.undoStack = [];
    this.redoStack = [];
    this.ensureFiles();
  }

  // Ensure task and history files exist
  ensureFiles() {
    if (!fs.existsSync(this.tasksFile)) {
      fs.writeFileSync(this.tasksFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify([], null, 2));
    }
  }

  // Read tasks from file
  readTasks() {
    try {
      const data = fs.readFileSync(this.tasksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading tasks:', error.message);
      return [];
    }
  }

  // Write tasks to file
  writeTasks(tasks) {
    try {
      fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing tasks:', error.message);
      throw new Error('Failed to save tasks');
    }
  }

  // Read action history
  readHistory() {
    try {
      const data = fs.readFileSync(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading history:', error.message);
      return [];
    }
  }

  // Write action history
  writeHistory(history) {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Error writing history:', error.message);
    }
  }

  // Add action to history
  addToHistory(action, details, taskData = null) {
    const history = this.readHistory();
    const historyEntry = {
      id: this.generateId(),
      action,
      details,
      timestamp: new Date().toISOString(),
      taskData: taskData ? JSON.parse(JSON.stringify(taskData)) : null
    };
    
    history.push(historyEntry);
    this.writeHistory(history);
    
    // Add to undo stack
    this.undoStack.push(historyEntry);
    // Clear redo stack when new action is performed
    this.redoStack = [];
    
    return historyEntry;
  }

  // Create a new task
  createTask(title, description = '') {
    const tasks = this.readTasks();
    
    const newTask = {
      id: this.generateId(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString()
    };

    tasks.push(newTask);
    this.writeTasks(tasks);
    
    // Add to history
    this.addToHistory('CREATE_TASK', `Created task: "${newTask.title}"`, newTask);
    
    return newTask;
  }

  // Complete a task
  completeTask(taskId) {
    const tasks = this.readTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    if (tasks[taskIndex].completed) {
      throw new Error('Task is already completed');
    }

    const originalTask = JSON.parse(JSON.stringify(tasks[taskIndex]));
    
    tasks[taskIndex].completed = true;
    tasks[taskIndex].completedAt = new Date().toISOString();
    tasks[taskIndex].updatedAt = new Date().toISOString();
    
    this.writeTasks(tasks);
    
    // Add to history with original task data for undo
    this.addToHistory('COMPLETE_TASK', `Completed task: "${tasks[taskIndex].title}"`, {
      original: originalTask,
      updated: tasks[taskIndex]
    });
    
    return tasks[taskIndex];
  }

  // Remove a task
  removeTask(taskId) {
    const tasks = this.readTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const removedTask = tasks[taskIndex];
    tasks.splice(taskIndex, 1);
    this.writeTasks(tasks);
    
    // Add to history
    this.addToHistory('REMOVE_TASK', `Removed task: "${removedTask.title}"`, removedTask);
    
    return removedTask;
  }

  // Undo last action
  undo() {
    if (this.undoStack.length === 0) {
      throw new Error('Nothing to undo');
    }

    const lastAction = this.undoStack.pop();
    const tasks = this.readTasks();

    switch (lastAction.action) {
      case 'CREATE_TASK':
        // Remove the created task
        const createIndex = tasks.findIndex(task => task.id === lastAction.taskData.id);
        if (createIndex !== -1) {
          tasks.splice(createIndex, 1);
          this.writeTasks(tasks);
        }
        break;

      case 'COMPLETE_TASK':
        // Restore task to incomplete state
        const completeIndex = tasks.findIndex(task => task.id === lastAction.taskData.updated.id);
        if (completeIndex !== -1) {
          tasks[completeIndex] = lastAction.taskData.original;
          this.writeTasks(tasks);
        }
        break;

      case 'REMOVE_TASK':
        // Restore the removed task
        tasks.push(lastAction.taskData);
        this.writeTasks(tasks);
        break;
    }

    // Move action to redo stack
    this.redoStack.push(lastAction);
    
    return lastAction;
  }

  // Redo last undone action
  redo() {
    if (this.redoStack.length === 0) {
      throw new Error('Nothing to redo');
    }

    const actionToRedo = this.redoStack.pop();
    const tasks = this.readTasks();

    switch (actionToRedo.action) {
      case 'CREATE_TASK':
        // Re-add the task
        tasks.push(actionToRedo.taskData);
        this.writeTasks(tasks);
        break;

      case 'COMPLETE_TASK':
        // Re-complete the task
        const completeIndex = tasks.findIndex(task => task.id === actionToRedo.taskData.original.id);
        if (completeIndex !== -1) {
          tasks[completeIndex] = actionToRedo.taskData.updated;
          this.writeTasks(tasks);
        }
        break;

      case 'REMOVE_TASK':
        // Re-remove the task
        const removeIndex = tasks.findIndex(task => task.id === actionToRedo.taskData.id);
        if (removeIndex !== -1) {
          tasks.splice(removeIndex, 1);
          this.writeTasks(tasks);
        }
        break;
    }

    // Move action back to undo stack
    this.undoStack.push(actionToRedo);
    
    return actionToRedo;
  }

  // Get all tasks
  getAllTasks() {
    return this.readTasks().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  // Get task by ID
  getTaskById(taskId) {
    const tasks = this.readTasks();
    return tasks.find(task => task.id === taskId);
  }

  // Get completed tasks
  getCompletedTasks() {
    return this.readTasks().filter(task => task.completed);
  }

  // Get pending tasks
  getPendingTasks() {
    return this.readTasks().filter(task => !task.completed);
  }

  // Get action history
  getHistory() {
    return this.readHistory();
  }

  // Get task statistics
  getStats() {
    const tasks = this.readTasks();
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.filter(task => !task.completed).length;
    
    return {
      total: tasks.length,
      completed,
      pending,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    };
  }

  // Generate unique ID
  generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Clear all completed tasks
  clearCompleted() {
    const tasks = this.readTasks();
    const completedTasks = tasks.filter(task => task.completed);
    const remainingTasks = tasks.filter(task => !task.completed);
    
    if (completedTasks.length === 0) {
      throw new Error('No completed tasks to clear');
    }

    this.writeTasks(remainingTasks);
    
    // Add to history
    this.addToHistory('CLEAR_COMPLETED', `Cleared ${completedTasks.length} completed tasks`, {
      clearedTasks: completedTasks
    });
    
    return completedTasks;
  }
}

module.exports = { TaskManager };