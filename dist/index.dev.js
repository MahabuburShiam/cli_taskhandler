#!/usr/bin/env node
"use strict";

var readline = require('readline');

var _require = require('./reg'),
    register = _require.register;

var _require2 = require('./signin'),
    signin = _require2.signin; // Create readline interface


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n=== Welcome to CLI User App ===');
  console.log('1. Register');
  console.log('2. Sign In');
  console.log('3. Exit');
  console.log('===============================');
}

function handleMenuChoice(choice) {
  switch (choice.trim()) {
    case '1':
      console.log('\n--- Registration ---');
      register(rl, function () {
        showMenuAndPrompt();
      });
      break;

    case '2':
      console.log('\n--- Sign In ---');
      signin(rl, function () {
        showMenuAndPrompt();
      });
      break;

    case '3':
      console.log('\nGoodbye!');
      rl.close();
      process.exit(0);
      break;

    default:
      console.log('\nInvalid choice. Please select 1, 2, or 3.');
      showMenuAndPrompt();
      break;
  }
}

function showMenuAndPrompt() {
  showMenu();
  rl.question('\nChoose an option (1-3): ', handleMenuChoice);
} // Start the application


console.clear();
console.log('🚀 CLI User Authentication System');
showMenuAndPrompt(); // Handle graceful exit

process.on('SIGINT', function () {
  console.log('\n\nGoodbye!');
  rl.close();
  process.exit(0);
});