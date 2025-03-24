// js/elements.js - DOM element references

// Form elements
const Elements = {
  // Connection form elements
  hostInput: document.getElementById('host'),
  portInput: document.getElementById('port'),
  proxyPortInput: document.getElementById('proxyPort'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectionForm: document.getElementById('connectionForm'),
  
  // Status elements
  statusDisplay: document.getElementById('status'),
  targetDisplay: document.getElementById('targetDisplay'),
  
  // Command input elements
  commandInput: document.getElementById('commandInput'),
  sendBtn: document.getElementById('sendBtn'),
  commandInputContainer: document.getElementById('commandInputContainer'),
  
  // Terminal elements
  terminalElement: document.getElementById('terminal'),
  clickIndicator: document.getElementById('clickIndicator'),
  
  // Additional properties that will be added dynamically
  localEchoCheckbox: null,
  echoContainer: null,
  terminalModeSelector: null,
  bufferDisplay: null,
  debugToggle: null,
  debugContainer: null,
  shortcutGuide: null,
  shortcutToggle: null
};

// App state
if (!window.AppState) {
  window.AppState = {
    socket: null,
    isConnected: false,
    terminalFocused: false,
    debugMode: false
  };
}

/**
 * Create local echo checkbox
 */
function createEchoToggle() {
  // Skip if already created
  if (Elements.localEchoCheckbox) return;

  const localEchoCheckbox = document.createElement('input');
  localEchoCheckbox.type = 'checkbox';
  localEchoCheckbox.id = 'localEchoToggle';
  localEchoCheckbox.checked = true;
  localEchoCheckbox.setAttribute('aria-label', 'Toggle local echo');
  
  const localEchoLabel = document.createElement('label');
  localEchoLabel.htmlFor = 'localEchoToggle';
  localEchoLabel.textContent = 'Local Echo';
  localEchoLabel.className = 'echo-label';
  
  const echoContainer = document.createElement('div');
  echoContainer.className = 'echo-container';
  echoContainer.setAttribute('role', 'checkbox');
  echoContainer.setAttribute('aria-checked', 'true');
  echoContainer.appendChild(localEchoCheckbox);
  echoContainer.appendChild(localEchoLabel);
  
  // Add the echo toggle after the terminal is created
  Elements.terminalElement.parentNode.insertBefore(echoContainer, Elements.terminalElement.nextSibling);
  
  // Add event listener for accessibility
  localEchoCheckbox.addEventListener('change', (e) => {
    echoContainer.setAttribute('aria-checked', e.target.checked ? 'true' : 'false');
  });
  
  // Add to Elements
  Elements.localEchoCheckbox = localEchoCheckbox;
  Elements.echoContainer = echoContainer;
}

/**
 * Reset dynamic UI elements
 * Call this on page reload or when rebuilding the UI
 */
function resetDynamicElements() {
  // Remove any existing dynamic elements
  ['echoContainer', 'bufferDisplay', 'debugContainer', 'shortcutGuide', 'shortcutToggle'].forEach(elementKey => {
    if (Elements[elementKey] && Elements[elementKey].parentNode) {
      Elements[elementKey].parentNode.removeChild(Elements[elementKey]);
      Elements[elementKey] = null;
    }
  });
  
  // Reset terminal mode selector container if exists
  const existingModeSelector = document.querySelector('.terminal-mode-container');
  if (existingModeSelector && existingModeSelector.parentNode) {
    existingModeSelector.parentNode.removeChild(existingModeSelector);
    Elements.terminalModeSelector = null;
  }
}

// Export any functions or variables needed by other modules
window.Elements = Elements;
window.createEchoToggle = createEchoToggle;
window.resetDynamicElements = resetDynamicElements;