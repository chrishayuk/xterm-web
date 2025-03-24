// js/ui.js - UI functionality

// Add a server type selector
function createServerTypeSelector() {
  // Create the container
  const selectorContainer = document.createElement('div');
  selectorContainer.className = 'server-selector-container';
  selectorContainer.style.margin = '10px 0';
  
  // Create the label
  const selectorLabel = document.createElement('label');
  selectorLabel.htmlFor = 'serverTypeSelector';
  selectorLabel.textContent = 'Server Type:';
  selectorLabel.style.marginRight = '10px';
  
  // Create the select element
  const selector = document.createElement('select');
  selector.id = 'serverTypeSelector';
  selector.className = 'server-type-selector';
  
  // Add options
  const options = [
    { value: 'auto', text: 'Auto Detect' },
    { value: 'telnet', text: 'Standard Telnet' },
    { value: 'stock', text: 'Stock Feed Server' }
  ];
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    selector.appendChild(option);
  });
  
  // Add event listener
  selector.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    if (selectedType === 'auto') {
      // Reset detection
      isStockServer = false;
      detectionComplete = false;
      console.log("Server type set to auto-detect");
    } else if (selectedType === 'stock') {
      setServerType('stock');
    } else {
      setServerType('telnet');
    }
  });
  
  // Assemble the container
  selectorContainer.appendChild(selectorLabel);
  selectorContainer.appendChild(selector);
  
  // Insert before the command input
  Elements.commandInputContainer.parentNode.insertBefore(
    selectorContainer, 
    Elements.commandInputContainer
  );
  
  // Store reference
  Elements.serverTypeSelector = selector;
}

// Update UI with connection status
function updateStatus(message, statusClass) {
  Elements.statusDisplay.textContent = message;
  Elements.statusDisplay.className = 'status ' + statusClass;
}

// Toggle connection controls based on connection state
function toggleConnectionControls(isConnected) {
  Elements.connectBtn.disabled = isConnected;
  Elements.disconnectBtn.disabled = !isConnected;
  Elements.hostInput.disabled = isConnected;
  Elements.portInput.disabled = isConnected;
  Elements.proxyPortInput.disabled = isConnected;
  
  // Show/hide command input
  Elements.commandInputContainer.style.display = isConnected ? 'flex' : 'none';
  
  // Add server type selector if connected and it doesn't exist yet
  if (isConnected && !Elements.serverTypeSelector) {
    createServerTypeSelector();
  }
  
  // Handle terminal resize when showing/hiding elements
  setTimeout(() => {
    if (fitAddon) {
      fitAddon.fit();
    }
  }, 100);
}

// Handle window resize
function handleResize() {
  if (fitAddon) {
    fitAddon.fit();
  }
}