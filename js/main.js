// js/main.js - Updated application initialization

/**
 * Initialize the application
 */
function initApp() {
  // Reset any dynamic elements from previous sessions
  if (typeof resetDynamicElements === 'function') {
    resetDynamicElements();
  }
  
  // Create echo toggle UI
  createEchoToggle();
  
  // Create direct connection toggle
  if (typeof createDirectConnectionToggle === 'function') {
    createDirectConnectionToggle();
  }
  
  // Initialize terminal
  initTerminal();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initial UI state
  updateStatus('Disconnected', 'disconnected');
  toggleConnectionControls(false);
  
  // Set initial focus
  setTimeout(() => {
    console.log("Setting initial focus to terminal");
    focusTerminal();
  }, 500);
  
  // Log initialization
  console.log("Web Terminal initialized with configuration:", {
    defaultLineMode: AppState.lineMode,
    debugMode: AppState.debugMode,
    terminalConfig: TerminalConfig,
    supportsDirectConnection: typeof createDirectConnectionToggle === 'function'
  });
}

/**
 * Check browser compatibility
 * @return {boolean} True if browser is compatible
 */
function checkBrowserCompatibility() {
  // Check for WebSocket support
  if (!window.WebSocket) {
    alert("Your browser doesn't support WebSockets, which are required for this application. Please use a modern browser.");
    return false;
  }
  
  // Check for other required features
  if (!window.matchMedia) {
    console.warn("Your browser doesn't support matchMedia. Responsive design features may not work correctly.");
  }
  
  return true;
}

// Initialize on page load
window.addEventListener('load', () => {
  if (checkBrowserCompatibility()) {
    initApp();
  }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && AppState.isConnected) {
    // When coming back to the page, make sure the terminal is responsive
    if (fitAddon) {
      setTimeout(() => {
        fitAddon.fit();
      }, 100);
    }
  }
});