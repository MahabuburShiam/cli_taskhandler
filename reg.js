const bcrypt = require('bcrypt');
const { UserData } = require('./UserData');

const userData = new UserData();

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

function register(rl, callback) {
  rl.question('Enter username: ', (username) => {
    if (!username.trim()) {
      console.log('❌ Username cannot be empty.');
      return callback();
    }

    rl.question('Enter email: ', async (email) => {
      if (!email.trim() || !isValidEmail(email)) {
        console.log('❌ Please enter a valid email address.');
        return callback();
      }

      // Check if email already exists (only check email, not username)
      if (userData.emailExists(email)) {
        console.log('❌ This email is already registered. Please use a different email or try signing in.');
        return callback();
      }

      try {
        // Hide password input
        const password = await hidePasswordInput(rl, 'Enter password: ');
        
        if (!password.trim()) {
          console.log('❌ Password cannot be empty.');
          return callback();
        }

        if (password.length < 6) {
          console.log('❌ Password must be at least 6 characters long.');
          return callback();
        }

        const confirmPassword = await hidePasswordInput(rl, 'Confirm password: ');
        
        if (password !== confirmPassword) {
          console.log('❌ Passwords do not match.');
          return callback();
        }

        // Hash password
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
          if (err) {
            console.log('❌ Error creating account. Please try again.');
            return callback();
          }

          // Save user data
          const user = {
            username: username.trim(),
            email: email.trim().toLowerCase(), // Store email in lowercase for consistency
            password: hashedPassword,
            createdAt: new Date().toISOString()
          };

          try {
            userData.addUser(user);
            console.log('✅ Registration successful! You can now sign in.');
          } catch (error) {
            console.log('❌ Error saving user data:', error.message);
          }

          callback();
        });
      } catch (error) {
        console.log('❌ Error during registration. Please try again.');
        callback();
      }
    });
  });
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = { register };