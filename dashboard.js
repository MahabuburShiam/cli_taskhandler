const { TaskManager } = require('./TaskManager');

class Dashboard {
  constructor(user) {
    this.user = user;
    this.taskManager = new TaskManager(user.username);
  }

  showDashboard(rl, callback) {
    console.clear();
    console.log('🎯 ====================================');
    console.log('     Welcome To Dashboard');
    console.log('🎯 ====================================');
    console.log(`👤 User: ${this.user.username}`);
    console.log(`📧 Email: ${this.user.email}`);
    console.log(`📅 Last Login: ${new Date().toLocaleString()}`);
    console.log('====================================\n');
    
    this.showTasks();
    this.showMenu(rl, callback);
  }

  showTasks() {
    const tasks = this.taskManager.getAllTasks();
    console.log('📝 YOUR TASKS:');
    console.log('--------------------');
    
    if (tasks.length === 0) {
      console.log('   No tasks yet. Create your first task!');
    } else {
      tasks.forEach((task, index) => {
        const status = task.completed ? '✅' : '⏳';
        const timeAgo = this.getTimeAgo(task.createdAt);
        console.log(`${index + 1}. ${status} ${task.title}`);
        console.log(`   📅 Created: ${timeAgo}`);
        if (task.completed && task.completedAt) {
          console.log(`   ✅ Completed: ${this.getTimeAgo(task.completedAt)}`);
        }
        if (task.description) {
          console.log(`   📄 ${task.description}`);
        }
        console.log('');
      });
    }
    console.log('--------------------');
  }

  showMenu(rl, callback) {
    console.log('\n🔧 DASHBOARD MENU:');
    console.log('1. Create Task');
    console.log('2. Complete Task');
    console.log('3. Remove Task');
    console.log('4. Undo Last Action');
    console.log('5. Redo Last Action');
    console.log('6. View Task History');
    console.log('7. Refresh Dashboard');
    console.log('8. Logout');
    console.log('========================');
    
    rl.question('Choose an option (1-8): ', (choice) => {
      this.handleMenuChoice(choice.trim(), rl, callback);
    });
  }

  handleMenuChoice(choice, rl, callback) {
    switch (choice) {
      case '1':
        this.createTask(rl, callback);
        break;
      case '2':
        this.completeTask(rl, callback);
        break;
      case '3':
        this.removeTask(rl, callback);
        break;
      case '4':
        this.undoAction(rl, callback);
        break;
      case '5':
        this.redoAction(rl, callback);
        break;
      case '6':
        this.viewHistory(rl, callback);
        break;
      case '7':
        this.showDashboard(rl, callback);
        break;
      case '8':
        console.log('\n👋 Logging out... Goodbye!');
        callback();
        break;
      default:
        console.log('❌ Invalid choice. Please select 1-8.');
        setTimeout(() => this.showMenu(rl, callback), 1000);
        break;
    }
  }

  createTask(rl, callback) {
    console.log('\n📝 CREATE NEW TASK');
    console.log('-------------------');
    
    rl.question('Task title: ', (title) => {
      if (!title.trim()) {
        console.log('❌ Task title cannot be empty.');
        return setTimeout(() => this.showDashboard(rl, callback), 1500);
      }

      rl.question('Task description (optional): ', (description) => {
        try {
          const task = this.taskManager.createTask(title.trim(), description.trim());
          console.log(`✅ Task created successfully!`);
          console.log(`📝 Title: ${task.title}`);
          console.log(`🆔 ID: ${task.id}`);
          console.log(`📅 Created: ${new Date(task.createdAt).toLocaleString()}`);
          
          setTimeout(() => this.showDashboard(rl, callback), 2000);
        } catch (error) {
          console.log(`❌ Error creating task: ${error.message}`);
          setTimeout(() => this.showDashboard(rl, callback), 2000);
        }
      });
    });
  }

  completeTask(rl, callback) {
    const tasks = this.taskManager.getAllTasks().filter(task => !task.completed);
    
    if (tasks.length === 0) {
      console.log('❌ No pending tasks to complete.');
      return setTimeout(() => this.showDashboard(rl, callback), 1500);
    }

    console.log('\n✅ COMPLETE TASK');
    console.log('------------------');
    console.log('Pending tasks:');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
    });

    rl.question('Enter task number to complete: ', (input) => {
      const taskIndex = parseInt(input) - 1;
      
      if (taskIndex < 0 || taskIndex >= tasks.length) {
        console.log('❌ Invalid task number.');
        return setTimeout(() => this.showDashboard(rl, callback), 1500);
      }

      try {
        const completedTask = this.taskManager.completeTask(tasks[taskIndex].id);
        console.log(`✅ Task "${completedTask.title}" completed successfully!`);
        console.log(`📅 Completed at: ${new Date(completedTask.completedAt).toLocaleString()}`);
        
        setTimeout(() => this.showDashboard(rl, callback), 2000);
      } catch (error) {
        console.log(`❌ Error completing task: ${error.message}`);
        setTimeout(() => this.showDashboard(rl, callback), 2000);
      }
    });
  }

  removeTask(rl, callback) {
    const tasks = this.taskManager.getAllTasks();
    
    if (tasks.length === 0) {
      console.log('❌ No tasks to remove.');
      return setTimeout(() => this.showDashboard(rl, callback), 1500);
    }

    console.log('\n🗑️ REMOVE TASK');
    console.log('----------------');
    console.log('All tasks:');
    tasks.forEach((task, index) => {
      const status = task.completed ? '✅' : '⏳';
      console.log(`${index + 1}. ${status} ${task.title}`);
    });

    rl.question('Enter task number to remove: ', (input) => {
      const taskIndex = parseInt(input) - 1;
      
      if (taskIndex < 0 || taskIndex >= tasks.length) {
        console.log('❌ Invalid task number.');
        return setTimeout(() => this.showDashboard(rl, callback), 1500);
      }

      rl.question(`Are you sure you want to remove "${tasks[taskIndex].title}"? (y/n): `, (confirm) => {
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
          try {
            const removedTask = this.taskManager.removeTask(tasks[taskIndex].id);
            console.log(`🗑️ Task "${removedTask.title}" removed successfully!`);
            
            setTimeout(() => this.showDashboard(rl, callback), 2000);
          } catch (error) {
            console.log(`❌ Error removing task: ${error.message}`);
            setTimeout(() => this.showDashboard(rl, callback), 2000);
          }
        } else {
          console.log('❌ Task removal cancelled.');
          setTimeout(() => this.showDashboard(rl, callback), 1500);
        }
      });
    });
  }

  undoAction(rl, callback) {
    try {
      const undoneAction = this.taskManager.undo();
      console.log(`↩️ Undone: ${undoneAction.action} - ${undoneAction.details}`);
      console.log(`📅 Original action time: ${new Date(undoneAction.timestamp).toLocaleString()}`);
      
      setTimeout(() => this.showDashboard(rl, callback), 2000);
    } catch (error) {
      console.log(`❌ ${error.message}`);
      setTimeout(() => this.showDashboard(rl, callback), 1500);
    }
  }

  redoAction(rl, callback) {
    try {
      const redoneAction = this.taskManager.redo();
      console.log(`↪️ Redone: ${redoneAction.action} - ${redoneAction.details}`);
      console.log(`📅 Original action time: ${new Date(redoneAction.timestamp).toLocaleString()}`);
      
      setTimeout(() => this.showDashboard(rl, callback), 2000);
    } catch (error) {
      console.log(`❌ ${error.message}`);
      setTimeout(() => this.showDashboard(rl, callback), 1500);
    }
  }

  viewHistory(rl, callback) {
    const history = this.taskManager.getHistory();
    
    console.clear();
    console.log('📜 ACTION HISTORY');
    console.log('==================');
    
    if (history.length === 0) {
      console.log('No actions performed yet.');
    } else {
      history.slice(-10).reverse().forEach((action, index) => { // Show last 10 actions
        console.log(`${index + 1}. ${action.action} - ${action.details}`);
        console.log(`   📅 ${new Date(action.timestamp).toLocaleString()}`);
        console.log('');
      });
    }
    
    console.log('Press any key to return to dashboard...');
    rl.question('', () => {
      this.showDashboard(rl, callback);
    });
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}

module.exports = { Dashboard };