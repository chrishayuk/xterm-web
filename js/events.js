// js/events.js - Updated event handling

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
  
  // Create direct connection toggle after load
  setTimeout(() => {
    if (typeof createDirectConnectionToggle === 'function') {
      createDirectConnectionToggle();
    }
  }, 100);
}

/**
* Add event handler for manual telnet connection
*/
function setupTelnetEventHandlers() {
// Add a button to force telnet mode when connecting
const forceTelnetCheckbox = document.createElement('input');
forceTelnetCheckbox.type = 'checkbox';
forceTelnetCheckbox.id = 'forceTelnetMode';
forceTelnetCheckbox.checked = false;

const forceTelnetLabel = document.createElement('label');
forceTelnetLabel.htmlFor = 'forceTelnetMode';
forceTelnetLabel.textContent = 'Force Telnet Mode';

const forceTelnetContainer = document.createElement('div');
forceTelnetContainer.className = 'telnet-force-container';
forceTelnetContainer.style.margin = '10px 0';
forceTelnetContainer.appendChild(forceTelnetCheckbox);
forceTelnetContainer.appendChild(forceTelnetLabel);

// Find where to insert the container
// Insert after direct connection toggle if it exists
if (Elements.directConnectionContainer) {
  Elements.directConnectionContainer.parentNode.insertBefore(
    forceTelnetContainer, 
    Elements.directConnectionContainer.nextSibling
  );
} else {
  // Original fallback insertion point
  const connectionForm = document.getElementById('connectionForm');
  const connectBtn = document.getElementById('connectBtn');
  if (connectionForm && connectBtn) {
    const container = connectBtn.parentNode;
    connectionForm.insertBefore(forceTelnetContainer, container);
  }
}

// Store in Elements for access
if (typeof Elements !== 'undefined') {
  Elements.forceTelnetCheckbox = forceTelnetCheckbox;
  Elements.forceTelnetContainer = forceTelnetContainer;
}

// Override the connect function to check for force telnet mode
const originalConnectToWebSocket = window.connectToWebSocket;
window.connectToWebSocket = function(isReconnect = false) {
  // Call the original function
  const result = originalConnectToWebSocket(isReconnect);
  
  // If connection started and force telnet is checked
  if (result && forceTelnetCheckbox.checked) {
    // Enable telnet mode immediately after connection
    setTimeout(() => {
      console.log("Forcing telnet mode due to checkbox");
      if (typeof enableTelnetMode === 'function') {
        enableTelnetMode();
      }
    }, 500);  // Wait for connection to establish
  }
  
  return result;
};
}

// Call this function during initialization
if (typeof window !== 'undefined') {
// Add to window.onload or call it directly
window.addEventListener('load', () => {
  if (typeof setupTelnetEventHandlers === 'function') {
    setupTelnetEventHandlers();
  }
});
}