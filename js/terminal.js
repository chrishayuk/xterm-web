// js/terminal.js - Terminal functionality with server-type detection

// Terminal instance and addons
let term;
let fitAddon;

// Line buffer to collect characters until Enter is pressed
let lineBuffer = '';

// Server detection flags
let isStockServer = false;
let detectionComplete = false;

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
  
  // Handle terminal input with server-specific handling
  term.onData((data) => {
    if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
      console.log("Terminal input:", data, data.charCodeAt(0));
      
      // Check for Enter/Return key (CR)
      if (data.charCodeAt(0) === 13) { // Enter/Return key (CR)
        if (isStockServer) {
          // For stock server, send the complete line
          AppState.socket.send(lineBuffer + '\n');
          console.log("Stock server mode - sending complete line:", lineBuffer);
          lineBuffer = '';
        } else {
          // For other servers, send CR+LF directly
          AppState.socket.send('\r\n');
        }
        
        // Handle local echo for Enter key
        if (Elements.localEchoCheckbox.checked) {
          term.write('\r\n');
        }
      } 
      // Handle backspace
      else if (data.charCodeAt(0) === 127 || data.charCodeAt(0) === 8) {
        if (isStockServer && lineBuffer.length > 0) {
          // Remove last character from buffer for stock server
          lineBuffer = lineBuffer.substring(0, lineBuffer.length - 1);
        } else {
          // For other servers, send backspace directly
          AppState.socket.send(data);
        }
        
        // Local echo for backspace
        if (Elements.localEchoCheckbox.checked) {
          term.write('\b \b');
        }
      } 
      // Handle normal character input
      else {
        if (isStockServer) {
          // For stock server, buffer the character
          lineBuffer += data;
        } else {
          // For other servers, send immediately
          AppState.socket.send(data);
        }
        
        // Echo normal characters if local echo is enabled
        if (Elements.localEchoCheckbox.checked) {
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
  
  // Send the command with appropriate newline
  if (isStockServer) {
    AppState.socket.send(command + '\n');
  } else {
    AppState.socket.send(command + '\r\n');
  }
  
  // Echo the command to the terminal if local echo is on
  if (Elements.localEchoCheckbox.checked) {
    term.write('\r\n> ' + command + '\r\n');
  }
  
  // Clear the input field
  Elements.commandInput.value = '';
  
  // Focus back to the terminal
  focusTerminal();
}

// Add server detection functionality
function detectServerType(data) {
  if (!detectionComplete) {
    // Check for stock server welcome message
    if (data.includes("Welcome to the Stock Feed Server!") || 
        data.includes("stock <ticker>") || 
        data.includes("Type 'quit' to disconnect")) {
      isStockServer = true;
      detectionComplete = true;
      console.log("Detected Stock Feed Server - enabling line buffering mode");
      
      // Show a notification to the user
      const notification = document.createElement('div');
      notification.textContent = "Stock Feed Server detected - Line Mode active";
      notification.className = "server-notification";
      notification.style.position = "absolute";
      notification.style.top = "10px";
      notification.style.right = "10px";
      notification.style.padding = "5px 10px";
      notification.style.background = "#4CAF50";
      notification.style.color = "white";
      notification.style.borderRadius = "4px";
      notification.style.zIndex = "1000";
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
    
    // After receiving some data, consider detection complete
    if (data.length > 100) {
      detectionComplete = true;
      console.log("Server detection complete - using standard telnet mode");
    }
  }
}

// Add a function to see the current line buffer (for debugging)
function getLineBuffer() {
  return lineBuffer;
}

// Add a function to manually clear the line buffer if needed
function clearLineBuffer() {
  lineBuffer = '';
  return true;
}

// Add a function to manually set the server type
function setServerType(type) {
  if (type === 'stock') {
    isStockServer = true;
  } else {
    isStockServer = false;
  }
  detectionComplete = true;
  console.log("Server type manually set to:", type);
  return true;
}