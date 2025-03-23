// events.js - Event handling

// Setup all event listeners
function setupEventListeners() {
    // Connection form submission
    Elements.connectionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      connectToWebSocket();
    });
    
    // Disconnect button click
    Elements.disconnectBtn.addEventListener('click', () => {
      disconnectFromWebSocket();
    });
    
    // Send button click
    Elements.sendBtn.addEventListener('click', () => {
      sendCommand();
    });
    
    // Command input Enter key
    Elements.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendCommand();
      }
    });
    
    // Terminal click to focus
    Elements.terminalElement.addEventListener('click', () => {
      console.log("Terminal clicked");
      focusTerminal();
    });
    
    // Window resize event
    window.addEventListener('resize', handleResize);
    
    // Add key press event listener to the document
    document.addEventListener('keydown', (e) => {
      // If we're already focused on an input field, don't capture
      if (document.activeElement === Elements.commandInput) {
        return;
      }
      
      // Capture keystrokes and redirect to terminal if not in an input field
      if (AppState.isConnected && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only process if it's a printable character or special key
        if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') {
          focusTerminal();
          // For special keys, we don't need to do anything as the terminal will handle them
        }
      }
    });
  }