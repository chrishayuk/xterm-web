// js/terminal-config.js - Terminal configuration settings
const TerminalConfig = {
  theme: {
    background: '#000000',
    foreground: '#00ff00',
  },
  fontSize: 14,
  cursorBlink: true,
  convertEol: true,
  cursorStyle: 'block',
  allowTransparency: true
};

// Global state with enhanced properties
const AppState = {
  // Connection state
  socket: null,
  isConnected: false,
  
  // UI state
  terminalFocused: false,
  debugMode: false,
  
  // Terminal mode properties
  lineMode: true,     // Default to line mode
  detectionComplete: false,
  
  // Reconnection properties
  reconnectAttempts: 0,
  maxReconnectAttempts: 3,
  
  // Last connection info for reconnection
  lastHost: "",
  lastPort: "",
  lastProxyPort: ""
};

// Constants for the application
const AppConstants = {
  CONNECTION_TIMEOUT: 10000,  // 10 seconds
  MAX_BUFFER_SIZE: 4096       // Maximum line buffer size
};