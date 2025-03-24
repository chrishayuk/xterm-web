// js/ui.js - UI functionality with simplified mode selector

/**
 * Create terminal mode selector
 */
function createTerminalModeSelector() {
  // Create the container
  const selectorContainer = document.createElement('div');
  selectorContainer.className = 'terminal-mode-container';
  selectorContainer.setAttribute('role', 'group');
  selectorContainer.setAttribute('aria-label', 'Terminal Input Mode Selection');
  
  // Create the label
  const selectorLabel = document.createElement('label');
  selectorLabel.htmlFor = 'terminalModeSelector';
  selectorLabel.textContent = 'Input Mode:';
  selectorLabel.className = 'selector-label';
  
  // Create the select element
  const selector = document.createElement('select');
  selector.id = 'terminalModeSelector';
  selector.className = 'terminal-mode-selector';
  selector.setAttribute('aria-label', 'Select Terminal Input Mode');
  
  // Add options - Character mode is default
  const options = [
    { value: 'character', text: 'Character Mode' },
    { value: 'line', text: 'Line Mode' }
  ];
  
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    selector.appendChild(option);
  });
  
  // Add event listener
  selector.addEventListener('change', (e) => {
    const selectedMode = e.target.value;
    if (selectedMode === 'line') {
      setTerminalMode('line');
      showNotification("Line input mode enabled", "info");
    } else {
      setTerminalMode('character');
      showNotification("Character input mode enabled", "info");
    }
    
    // Focus terminal after selection
    setTimeout(() => focusTerminal(), 100);
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
  Elements.terminalModeSelector = selector;
  
  // Apply responsive styles
  applyResponsiveStyles(selectorContainer);
}

/**
 * Create debug log toggle
 */
function createDebugToggle() {
  // Create container
  const debugContainer = document.createElement('div');
  debugContainer.className = 'debug-container';
  debugContainer.setAttribute('role', 'checkbox');
  debugContainer.setAttribute('aria-checked', 'false');
  
  // Create toggle
  const debugToggle = document.createElement('input');
  debugToggle.type = 'checkbox';
  debugToggle.id = 'debugToggle';
  debugToggle.checked = false;
  debugToggle.setAttribute('aria-label', 'Toggle debug logging');
  
  // Create label
  const debugLabel = document.createElement('label');
  debugLabel.htmlFor = 'debugToggle';
  debugLabel.textContent = 'Debug Mode';
  debugLabel.className = 'debug-label';
  
  // Add to container
  debugContainer.appendChild(debugToggle);
  debugContainer.appendChild(debugLabel);
  
  // Event listener
  debugToggle.addEventListener('change', (e) => {
    const isDebug = e.target.checked;
    console.log("Debug mode:", isDebug ? "enabled" : "disabled");
    
    // Set debug mode
    AppState.debugMode = isDebug;
    debugContainer.setAttribute('aria-checked', isDebug ? 'true' : 'false');
    
    // Toggle debug elements visibility
    if (Elements.bufferDisplay) {
      Elements.bufferDisplay.style.display = isDebug ? 'block' : (AppState.lineMode ? 'block' : 'none');
    }
  });
  
  // Find where to insert it (after echo toggle)
  if (Elements.echoContainer) {
    Elements.echoContainer.parentNode.insertBefore(
      debugContainer,
      Elements.echoContainer.nextSibling
    );
  } else {
    // Fallback insertion
    Elements.terminalElement.parentNode.insertBefore(
      debugContainer,
      Elements.terminalElement.nextSibling
    );
  }
  
  // Store reference
  Elements.debugToggle = debugToggle;
  Elements.debugContainer = debugContainer;
}

/**
 * Apply responsive styles to an element
 * @param {HTMLElement} element The element to style
 */
function applyResponsiveStyles(element) {
  // Base styles
  element.style.margin = '10px 0';
  
  // Responsive adjustments
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  function updateStyles(e) {
    if (e.matches) {
      // Mobile styles
      element.style.flexDirection = 'column';
      element.style.alignItems = 'flex-start';
    } else {
      // Desktop styles
      element.style.flexDirection = 'row';
      element.style.alignItems = 'center';
    }
  }
  
  // Initial check
  updateStyles(mediaQuery);
  
  // Add listener for changes
  mediaQuery.addEventListener('change', updateStyles);
}

/**
 * Update UI with connection status
 * @param {string} message Status message to display
 * @param {string} statusClass CSS class for styling
 */
function updateStatus(message, statusClass) {
  Elements.statusDisplay.textContent = message;
  Elements.statusDisplay.className = 'status ' + statusClass;
  
  // Also update for screen readers
  Elements.statusDisplay.setAttribute('aria-label', 'Connection status: ' + message);
}

/**
 * Toggle connection controls based on connection state
 * @param {boolean} isConnected Whether the connection is active
 */
function toggleConnectionControls(isConnected) {
  Elements.connectBtn.disabled = isConnected;
  Elements.disconnectBtn.disabled = !isConnected;
  Elements.hostInput.disabled = isConnected;
  Elements.portInput.disabled = isConnected;
  Elements.proxyPortInput.disabled = isConnected;
  
  // ARIA attributes for accessibility
  Elements.connectBtn.setAttribute('aria-disabled', isConnected);
  Elements.disconnectBtn.setAttribute('aria-disabled', !isConnected);
  
  // Show/hide command input
  Elements.commandInputContainer.style.display = isConnected ? 'flex' : 'none';
  
  // Add terminal mode selector if connected and it doesn't exist yet
  if (isConnected && !Elements.terminalModeSelector) {
    createTerminalModeSelector();
  }
  
  // Create debug toggle if it doesn't exist yet
  if (isConnected && !Elements.debugToggle) {
    createDebugToggle();
  }
  
  // Create keyboard shortcut guide if it doesn't exist yet
  if (isConnected && !Elements.shortcutGuide) {
    createKeyboardShortcutGuide();
  }
  
  // Handle terminal resize when showing/hiding elements
  setTimeout(() => {
    if (fitAddon) {
      fitAddon.fit();
    }
  }, 100);
}

/**
 * Handle window resize
 */
function handleResize() {
  if (fitAddon) {
    fitAddon.fit();
  }
}

/**
 * Add keyboard shortcut guide below the terminal
 */
function createKeyboardShortcutGuide() {
  const guideContainer = document.createElement('div');
  guideContainer.className = 'keyboard-shortcuts';
  guideContainer.style.marginTop = '10px';
  guideContainer.style.fontSize = '14px';
  guideContainer.style.color = '#666';
  
  // Shortcuts to display
  const shortcuts = [
    { key: 'Ctrl+U', description: 'Clear line buffer' },
    { key: 'Ctrl+C', description: 'Send break signal' },
    { key: 'Enter', description: 'Send line / return' }
  ];
  
  // Create shortcut elements
  shortcuts.forEach(shortcut => {
    const shortcutElement = document.createElement('div');
    shortcutElement.className = 'shortcut-item';
    shortcutElement.style.display = 'inline-block';
    shortcutElement.style.marginRight = '15px';
    
    const keyElement = document.createElement('kbd');
    keyElement.textContent = shortcut.key;
    keyElement.style.backgroundColor = '#f7f7f7';
    keyElement.style.border = '1px solid #ccc';
    keyElement.style.borderRadius = '3px';
    keyElement.style.padding = '1px 5px';
    keyElement.style.marginRight = '5px';
    
    shortcutElement.appendChild(keyElement);
    shortcutElement.appendChild(document.createTextNode(': ' + shortcut.description));
    
    guideContainer.appendChild(shortcutElement);
  });
  
  // Add toggle link to show/hide shortcuts
  const toggleLink = document.createElement('a');
  toggleLink.href = '#';
  toggleLink.textContent = 'Keyboard shortcuts';
  toggleLink.style.color = '#666';
  toggleLink.style.textDecoration = 'underline';
  toggleLink.style.cursor = 'pointer';
  
  // Initially hide the shortcuts
  guideContainer.style.display = 'none';
  
  // Toggle visibility on click
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    guideContainer.style.display = guideContainer.style.display === 'none' ? 'block' : 'none';
    toggleLink.textContent = guideContainer.style.display === 'none' ? 'Keyboard shortcuts' : 'Hide shortcuts';
  });
  
  // Insert toggle link at the bottom of the page
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'shortcut-toggle';
  toggleContainer.style.marginTop = '10px';
  toggleContainer.style.textAlign = 'right';
  toggleContainer.appendChild(toggleLink);
  
  // Add to the page
  const parentElement = Elements.terminalElement.parentNode;
  parentElement.appendChild(toggleContainer);
  parentElement.appendChild(guideContainer);
  
  // Store reference
  Elements.shortcutGuide = guideContainer;
  Elements.shortcutToggle = toggleLink;
}