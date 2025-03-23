// terminal.js - Terminal functionality

// Terminal instance and addons
let term;
let fitAddon;

// Initialize the terminal
function initTerminal() {
  // Create terminal with configuration
  term = new Terminal(TerminalConfig);

  // Use the FitAddon to make the terminal resize to its container
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  
  // Open terminal and fit to container
  term.open(Elements.terminalElement);
  fitAddon.fit();
  
  // Handle terminal input
  term.onData((data) => {
    if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
      console.log("Terminal input:", data);
      
      // Send the data to the server
      AppState.socket.send(data);
      
      // Check if local echo is enabled
      if (Elements.localEchoCheckbox.checked) {
        // Special treatment for common control characters
        if (data.charCodeAt(0) === 13) { // Enter/Return key (CR)
          // Don't echo CR, server will handle line feeds
        } else if (data.charCodeAt(0) === 127 || data.charCodeAt(0) === 8) { // Backspace
          // Handle backspace locally
          term.write('\b \b');
        } else {
          // Echo normal characters
          term.write(data);
        }
      }
    } else {
      console.log("Can't send data, socket not connected");
    }
  });
  
  // Terminal focus events
  term.textarea.addEventListener('focus', () => {
    AppState.terminalFocused = true;
    console.log("Terminal focused");
  });
  
  term.textarea.addEventListener('blur', () => {
    AppState.terminalFocused = false;
    console.log("Terminal unfocused");
  });
}

// Focus the terminal
function focusTerminal() {
  term.focus();
  AppState.terminalFocused = true;
}

// Send a command to the server
function sendCommand() {
  const command = Elements.commandInput.value.trim();
  if (!command || !AppState.socket || AppState.socket.readyState !== WebSocket.OPEN) return;
  
  console.log("Sending command:", command);
  
  // Send the command with a newline
  AppState.socket.send(command + '\n');
  
  // Echo the command to the terminal if local echo is on
  if (Elements.localEchoCheckbox.checked) {
    term.write('\r\n> ' + command + '\r\n');
  }
  
  // Clear the input field
  Elements.commandInput.value = '';
  
  // Focus back to the terminal
  focusTerminal();
}