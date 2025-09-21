const fs = require('fs');
const path = require('path');

class UserData {
  constructor() {
    this.dataFile = path.join(__dirname, 'users.json');
    this.ensureDataFile();
  }

  // Ensure the data file exists
  ensureDataFile() {
    if (!fs.existsSync(this.dataFile)) {
      fs.writeFileSync(this.dataFile, JSON.stringify([], null, 2));
    }
  }

  // Read all users from file
  readUsers() {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading user data:', error.message);
      return [];
    }
  }

  // Write users to file
  writeUsers(users) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(users, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing user data:', error.message);
      throw new Error('Failed to save user data');
    }
  }

  // Check if username exists
  userExists(username) {
    const users = this.readUsers();
    return users.some(user => user.username.toLowerCase() === username.toLowerCase());
  }

  // Check if email exists
  emailExists(email) {
    const users = this.readUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Add new user
  addUser(user) {
    const users = this.readUsers();
    
    // Only check for existing email (allow duplicate usernames)
    if (this.emailExists(user.email)) {
      throw new Error('Email already exists');
    }

    // Add user with additional metadata
    const newUser = {
      ...user,
      id: this.generateUserId(),
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: null
    };

    users.push(newUser);
    this.writeUsers(users);
    return newUser;
  }

  // Find user by username or email
  findUser(identifier) {
    const users = this.readUsers();
    return users.find(user => 
      user.username.toLowerCase() === identifier.toLowerCase() || 
      user.email.toLowerCase() === identifier.toLowerCase()
    );
  }

  // Update last login time
  updateLastLogin(username) {
    const users = this.readUsers();
    const userIndex = users.findIndex(user => user.username.toLowerCase() === username.toLowerCase());
    
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date().toISOString();
      this.writeUsers(users);
    }
  }

  // Get user by ID
  getUserById(id) {
    const users = this.readUsers();
    return users.find(user => user.id === id);
  }

  // Delete user (for admin functionality)
  deleteUser(username) {
    const users = this.readUsers();
    const filteredUsers = users.filter(user => user.username.toLowerCase() !== username.toLowerCase());
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }
    
    this.writeUsers(filteredUsers);
    return true;
  }

  // Get all users (for admin functionality)
  getAllUsers() {
    return this.readUsers().map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    })); // Return without password hashes
  }

  // Generate unique user ID
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get user count
  getUserCount() {
    return this.readUsers().length;
  }
}

module.exports = { UserData };