// config.js - Terminal configuration settings
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
  
  // Global state
  const AppState = {
    socket: null,
    isConnected: false,
    terminalFocused: false
  };