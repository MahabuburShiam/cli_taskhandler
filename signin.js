const bcrypt = require('bcrypt');
const { UserData } = require('./UserData');
const { Dashboard } = require('./dashboard');

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

function signin(rl, callback) {
  rl.question('Enter username or email: ', async (identifier) => {
    if (!identifier.trim()) {
      console.log('❌ Username/email cannot be empty.');
      return callback();
    }

    try {
      const password = await hidePasswordInput(rl, 'Enter password: ');
      
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
          console.log('✅ Sign in successful!');
          
          // Update last login
          userData.updateLastLogin(user.username);
          
          // Create dashboard instance and show it
          const dashboard = new Dashboard(user);
          setTimeout(() => {
            dashboard.showDashboard(rl, callback);
          }, 1000);
        } else {
          console.log('❌ Invalid username/email or password.');
          callback();
        }
      });
    } catch (error) {
      console.log('❌ Error during sign in:', error.message);
      callback();
    }
  });
}

module.exports = { signin };