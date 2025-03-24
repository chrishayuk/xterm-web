// js/terminal.js - Terminal functionality with manual mode selection

// Terminal instance and addons
let term;
let fitAddon;

// Line buffer to collect characters until Enter is pressed
let lineBuffer = '';

// Buffer display element (for visual indication of current buffer)
let bufferDisplay = null;

/**
 * Initialize the terminal with all necessary configurations and event handlers
 */
function initTerminal() {
  // Create terminal with configuration
  term = new Terminal(TerminalConfig);

  // Use the FitAddon to make the terminal resize to its container
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  
  // Open terminal and fit to container
  term.open(Elements.terminalElement);
  fitAddon.fit();
  
  // Create buffer display element for visual feedback
  createBufferDisplay();
  
  // Set default to character mode (not line mode)
  AppState.lineMode = false;
  
  // Handle terminal input with mode-specific handling
  term.onData((data) => {
    if (!AppState.socket || AppState.socket.readyState !== WebSocket.OPEN) {
      console.log("Can't send data, socket not connected");
      return;
    }
    
    try {
      console.log("Terminal input:", data, data.charCodeAt(0));
      
      // Handle special key combinations
      if (data.charCodeAt(0) === 21) { // Ctrl+U: Clear line buffer
        lineBuffer = '';
        updateBufferDisplay();
        return;
      }
      
      // Check for Enter/Return key (CR)
      if (data.charCodeAt(0) === 13) { // Enter/Return key (CR)
        if (AppState.lineMode) {
          // For line mode, send the complete line
          sendToSocket(lineBuffer + '\n');
          console.log("Line mode - sending complete line:", lineBuffer);
          lineBuffer = '';
        } else {
          // For character mode, send CR+LF for maximum compatibility
          console.log("Character mode - sending CR+LF");
          sendToSocket('\r');
          sendToSocket('\n');
        }
        
        // Handle local echo for Enter key
        if (Elements.localEchoCheckbox && Elements.localEchoCheckbox.checked) {
          term.write('\r\n');
        }
      } 
      // Handle backspace
      else if (data.charCodeAt(0) === 127 || data.charCodeAt(0) === 8) {
        if (AppState.lineMode && lineBuffer.length > 0) {
          // Remove last character from buffer in line mode
          lineBuffer = lineBuffer.substring(0, lineBuffer.length - 1);
        } else if (!AppState.lineMode) {
          // For character mode, send backspace directly
          sendToSocket(data);
        }
        
        // Local echo for backspace
        if (Elements.localEchoCheckbox && Elements.localEchoCheckbox.checked) {
          term.write('\b \b');
        }
      } 
      // Handle normal character input
      else {
        if (AppState.lineMode) {
          // For line mode, buffer the character if within size limit
          if (lineBuffer.length < AppConstants.MAX_BUFFER_SIZE) {
            lineBuffer += data;
          } else {
            console.warn("Line buffer size limit reached!");
            // Show a visual indication that buffer is full
            if (bufferDisplay) {
              bufferDisplay.style.backgroundColor = "#ff3333";
              setTimeout(() => {
                bufferDisplay.style.backgroundColor = "#333";
              }, 500);
            }
          }
        } else {
          // For character mode, send immediately
          sendToSocket(data);
        }
        
        // Echo normal characters if local echo is enabled
        if (Elements.localEchoCheckbox && Elements.localEchoCheckbox.checked) {
          term.write(data);
        }
      }
      
      // Update buffer display
      updateBufferDisplay();
      
    } catch (error) {
      console.error("Error handling terminal input:", error);
      // Provide user feedback on error
      term.write("\r\n\x1b[31mError processing input. See console for details.\x1b[0m\r\n");
    }
  });
  
  // Terminal focus events
  term.textarea.addEventListener('focus', () => {
    AppState.terminalFocused = true;
    console.log("Terminal focused");
    if (bufferDisplay) {
      bufferDisplay.classList.add('focused');
    }
  });
  
  term.textarea.addEventListener('blur', () => {
    AppState.terminalFocused = false;
    console.log("Terminal unfocused");
    if (bufferDisplay) {
      bufferDisplay.classList.remove('focused');
    }
  });
  
  // Add keyboard shortcuts for the document
  document.addEventListener('keydown', handleGlobalKeyboardShortcuts);
}

/**
 * Send data to WebSocket with error handling
 * @param {string} data The data to send
 * @return {boolean} Success or failure
 */
function sendToSocket(data) {
  try {
    if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
      AppState.socket.send(data);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending to WebSocket:", error);
    return false;
  }
}

/**
 * Handle global keyboard shortcuts
 */
function handleGlobalKeyboardShortcuts(e) {
  // Ctrl+U: Clear line buffer
  if (e.ctrlKey && e.key === 'u' && AppState.isConnected) {
    e.preventDefault();
    lineBuffer = '';
    updateBufferDisplay();
    console.log("Line buffer cleared with keyboard shortcut");
  }
}

/**
 * Create a visual display for the current buffer content
 */
function createBufferDisplay() {
  if (bufferDisplay) return; // Already created
  
  bufferDisplay = document.createElement('div');
  bufferDisplay.className = 'buffer-display';
  bufferDisplay.innerHTML = '<span class="buffer-label">Buffer:</span> <span class="buffer-content"></span>';
  
  // Add to the page
  Elements.terminalElement.parentNode.insertBefore(bufferDisplay, Elements.terminalElement.nextSibling);
  Elements.bufferDisplay = bufferDisplay;
}

/**
 * Update the buffer display with current content
 */
function updateBufferDisplay() {
  if (!bufferDisplay) return;
  
  // Only show for line mode
  bufferDisplay.style.display = AppState.lineMode ? 'block' : 'none';
  
  if (AppState.lineMode) {
    const contentElement = bufferDisplay.querySelector('.buffer-content');
    if (contentElement) {
      // Limit displayed content for performance
      const displayText = lineBuffer.length > 50 
        ? lineBuffer.substring(0, 47) + '...' 
        : lineBuffer;
      
      contentElement.textContent = displayText || '[empty]';
      
      // Show buffer size
      const sizeIndicator = document.createElement('span');
      sizeIndicator.className = 'buffer-size';
      sizeIndicator.textContent = ` (${lineBuffer.length}/${AppConstants.MAX_BUFFER_SIZE})`;
      sizeIndicator.style.color = lineBuffer.length > AppConstants.MAX_BUFFER_SIZE * 0.8 ? '#ff9966' : '#aaaaaa';
      
      // Replace existing size indicator if any
      const existingIndicator = bufferDisplay.querySelector('.buffer-size');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      contentElement.appendChild(sizeIndicator);
    }
  }
}

/**
 * Focus the terminal
 */
function focusTerminal() {
  term.focus();
  AppState.terminalFocused = true;
}

/**
 * Send a command to the server
 */
function sendCommand() {
  const command = Elements.commandInput.value.trim();
  if (!command || !AppState.socket || AppState.socket.readyState !== WebSocket.OPEN) return;
  
  console.log("Sending command:", command);
  
  try {
    // Send the command with appropriate newline
    if (AppState.lineMode) {
      AppState.socket.send(command + '\n');
    } else {
      AppState.socket.send(command + '\r\n');
    }
    
    // Echo the command to the terminal if local echo is on
    if (Elements.localEchoCheckbox && Elements.localEchoCheckbox.checked) {
      term.write('\r\n> ' + command + '\r\n');
    }
    
    // Clear the input field
    Elements.commandInput.value = '';
    
    // Focus back to the terminal
    focusTerminal();
  } catch (error) {
    console.error("Error sending command:", error);
    updateStatus('Error sending command', 'error');
  }
}

/**
 * Set the terminal mode manually
 * @param {string} mode The terminal mode ('line' or 'character')
 * @return {boolean} Success
 */
function setTerminalMode(mode) {
  AppState.lineMode = (mode === 'line');
  console.log("Terminal mode manually set to:", mode);
  updateBufferDisplay();
  return true;
}

/**
 * Show a temporary notification to the user
 * @param {string} message The message to display
 * @param {string} type The notification type (success, error, warning)
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = "terminal-notification";
  notification.style.position = "absolute";
  notification.style.top = "10px";
  notification.style.right = "10px";
  notification.style.padding = "5px 10px";
  notification.style.color = "white";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";
  
  // Color based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = "#4CAF50";
      break;
    case 'error':
      notification.style.backgroundColor = "#f44336";
      break;
    case 'warning':
      notification.style.backgroundColor = "#ff9800";
      break;
    default:
      notification.style.backgroundColor = "#2196F3";
  }
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
}

/**
 * Get the current line buffer
 * @return {string} The current line buffer content
 */
function getLineBuffer() {
  return lineBuffer;
}

/**
 * Clear the line buffer
 * @return {boolean} Success
 */
function clearLineBuffer() {
  lineBuffer = '';
  updateBufferDisplay();
  return true;
}

/**
 * Clean up resources before unloading
 */
function cleanup() {
  // Remove event listeners
  document.removeEventListener('keydown', handleGlobalKeyboardShortcuts);
  
  // Close WebSocket if open
  if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
    try {
      AppState.socket.close();
    } catch (e) {
      console.error("Error closing WebSocket:", e);
    }
  }
}

// Register cleanup on page unload
window.addEventListener('beforeunload', cleanup);