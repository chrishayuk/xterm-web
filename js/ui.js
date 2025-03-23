// ui.js - UI update and control functions

// Update the connection status display
function updateStatus(message, state) {
    Elements.statusDisplay.textContent = message;
    
    // Reset all state classes
    Elements.statusDisplay.classList.remove('status-disconnected', 'status-connecting', 'status-connected', 'status-error');
    Elements.statusDisplay.className = 'status';
    
    // Apply appropriate class based on state
    switch (state) {
      case 'disconnected':
        // Default class is already applied
        break;
      case 'connecting':
        Elements.statusDisplay.classList.add('connecting');
        break;
      case 'connected':
        Elements.statusDisplay.classList.add('connected');
        break;
      case 'error':
        Elements.statusDisplay.classList.add('error');
        break;
    }
  }
  
  // Toggle UI controls based on connection state
  function toggleConnectionControls(isConnected) {
    // Connection form fields
    Elements.hostInput.disabled = isConnected;
    Elements.portInput.disabled = isConnected;
    Elements.proxyPortInput.disabled = isConnected;
    Elements.connectBtn.disabled = isConnected;
    
    // Disconnect button
    Elements.disconnectBtn.disabled = !isConnected;
    
    // Command input
    Elements.commandInputContainer.style.display = isConnected ? 'flex' : 'none';
  }
  
  // Resize terminal when window resizes
  function handleResize() {
    if (fitAddon) {
      fitAddon.fit();
    }
  }