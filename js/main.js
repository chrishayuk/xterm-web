// main.js - Application initialization

// Initialize the application
function initApp() {
    // Create echo toggle UI
    createEchoToggle();
    
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
  }
  
  // Initialize on page load
  window.addEventListener('load', initApp);