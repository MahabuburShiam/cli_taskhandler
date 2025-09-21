# CLI Task Handler

A simple Node.js CLI application for managing user data and tasks. This project provides a basic user management system using a local JSON file for storage.

## Features

- Add new users with unique email addresses
- Check for existing usernames or emails
- Find users by username or email
- Update last login time for users
- Delete users (admin functionality)
- List all users (admin functionality)
- Get user count
- Data stored locally in `users.json`

## File Structure

- `UserData.js` – Core class for user data management (CRUD operations)
- `users.json` – Local file for storing user data (auto-created)

## Usage

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Import and use the `UserData` class:**
   ```javascript
   const { UserData } = require('./UserData');
   const userData = new UserData();

   // Add a user
   try {
     const newUser = userData.addUser({
       username: 'john_doe',
       email: 'john@example.com',
       password: 'securepassword'
     });
     console.log('User added:', newUser);
   } catch (err) {
     console.error(err.message);
   }

   // List all users
   console.log(userData.getAllUsers());
   ```

3. **Run your CLI scripts:**
   ```
   node example.js
   ```

## Data Format

Each user object in `users.json` contains:
- `id` (unique string)
- `username`
- `email`
- `password` (plain text for demo; use hashing in production)
- `createdAt`
- `lastLogin`

## Notes

- This project is for demonstration and learning purposes.
- Passwords are stored in plain text. For real applications, use proper hashing.
- All data is stored locally; no database required.

## License

MIT License
