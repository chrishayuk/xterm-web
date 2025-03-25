// js/telnet-integration.js - Integration of telnet handler with socket

/**
 * Enhance AppState with telnet functionality
 */
AppState.telnetMode = false;        // Whether telnet mode is active
AppState.telnetHandler = null;      // The telnet handler instance
AppState.autoDetectTelnet = true;   // Whether to auto-detect telnet servers
AppState.telnetInitialized = false; // Whether telnet has been initialized for this connection

/**
 * Track outgoing commands to prevent duplication when sending to the server
 */
const CommandTracker = {
  // Set to track recent command signatures (command-option pairs)
  recentCommands: new Set(),
  
  // How long to track commands for deduplication (ms)
  trackingWindow: 2000,
  
  /**
   * Check if a command sequence was recently sent
   * @param {Uint8Array} data The data to check
   * @return {boolean} True if this command was recently sent
   */
  wasSentRecently(data) {
    // Skip checking for non-telnet or too short data
    if (!data || data.length < 3 || data[0] !== TelnetCommands.IAC) {
      return false;
    }
    
    // Create a signature of the command
    const commandSignature = this.getCommandSignature(data);
    
    if (this.recentCommands.has(commandSignature)) {
      console.log(`Preventing duplicate outgoing command: ${commandSignature}`);
      return true;
    }
    
    // Add to recent commands
    this.recentCommands.add(commandSignature);
    
    // Set timeout to remove from tracking
    setTimeout(() => {
      this.recentCommands.delete(commandSignature);
    }, this.trackingWindow);
    
    return false;
  },
  
  /**
   * Generate a unique signature for a command sequence
   * @param {Uint8Array} data The command data
   * @return {string} A unique signature for this command
   */
  getCommandSignature(data) {
    // For basic commands (3 bytes), use simple signature
    if (data.length === 3 && data[0] === TelnetCommands.IAC) {
      const cmdName = data[1] in CommandNames ? CommandNames[data[1]] : `CMD-${data[1]}`;
      const optName = data[2] in OptionNames ? OptionNames[data[2]] : `OPT-${data[2]}`;
      return `IAC-${cmdName}-${optName}`;
    }
    
    // For subnegotiation, include the option and length
    if (data.length > 3 && data[0] === TelnetCommands.IAC && data[1] === TelnetCommands.SB) {
      const optName = data[2] in OptionNames ? OptionNames[data[2]] : `OPT-${data[2]}`;
      return `IAC-SB-${optName}-${data.length}`;
    }
    
    // For other data, use a hash of the first few bytes
    return `TELNET-DATA-${Array.from(data.slice(0, Math.min(8, data.length))).join('-')}`;
  },
  
  /**
   * Reset the command tracker
   */
  reset() {
    this.recentCommands.clear();
  }
};

/**
 * Initialize telnet handler for a connection
 */
function initializeTelnetHandler() {
  // Reset command tracker on new connection
  CommandTracker.reset();
  
  // Create the telnet handler with a callback for sending data
  AppState.telnetHandler = new TelnetHandler(
    // Send callback
    function(data) {
      if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
        const binaryData = (data instanceof Uint8Array) ? data : new TextEncoder().encode(data);
        
        // Skip sending if this is a duplicated command
        if (data instanceof Uint8Array && 
            data.length >= 3 && 
            data[0] === TelnetCommands.IAC &&
            CommandTracker.wasSentRecently(data)) {
          return true; // Pretend we sent it successfully
        }
        
        // Always log telnet commands being sent, regardless of debug mode
        if (data instanceof Uint8Array) {
          // Check if this is likely a telnet command
          if (data.length >= 3 && data[0] === TelnetCommands.IAC) {
            const cmdName = CommandNames[data[1]] || `CMD-${data[1]}`;
            const optName = data[2] in OptionNames ? OptionNames[data[2]] : `OPT-${data[2]}`;
            console.log(`Sending telnet: IAC ${cmdName} ${optName}`);
          } else if (data.length > 5 && data[0] === TelnetCommands.IAC && data[1] === TelnetCommands.SB) {
            const optName = data[2] in OptionNames ? OptionNames[data[2]] : `OPT-${data[2]}`;
            console.log(`Sending telnet subnegotiation for ${optName}`);
          } else if (AppState.debugMode) {
            console.log('Sending telnet data:', Array.from(data));
          }
        } else if (AppState.debugMode) {
          console.log('Sending data:', data);
        }
        
        AppState.socket.send(binaryData);
        return true;
      }
      return false;
    },
    // Always enable debug mode initially to capture negotiation
    true
  );

  // Reset telnet mode
  AppState.telnetMode = false;
  AppState.telnetInitialized = false;
  
  // Ensure we're tracking window dimensions
  if (term && fitAddon) {
    setTimeout(() => {
      fitAddon.fit();
      if (AppState.telnetHandler) {
        const dimensions = term.rows !== undefined ? 
          { rows: term.rows, cols: term.cols } : 
          { rows: 24, cols: 80 };
        AppState.telnetHandler.setDimensions(dimensions.cols, dimensions.rows);
      }
    }, 100);
  }
}

/**
 * Handle incoming socket data with telnet protocol support
 * @param {MessageEvent} e The WebSocket message event
 */
function handleSocketMessageWithTelnet(e) {
  try {
    if (AppState.debugMode) {
      if (e.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.data);
        console.log(`Received binary data from WebSocket (${bytes.length} bytes)`, 
                    Array.from(bytes.slice(0, Math.min(20, bytes.length))));
      } else {
        console.log(`Received text data from WebSocket: ${e.data.substring(0, 50)}${e.data.length > 50 ? '...' : ''}`);
      }
    }

    // Process data regardless of current mode
    const processData = async () => {
      let uint8Data;
      
      // Handle different data types, ensuring we always end up with Uint8Array
      if (e.data instanceof ArrayBuffer) {
        // Already binary data
        uint8Data = new Uint8Array(e.data);
      } else if (typeof e.data === 'string') {
        // Convert string to bytes
        uint8Data = new TextEncoder().encode(e.data);
      } else if (e.data instanceof Blob) {
        // Convert Blob to ArrayBuffer
        const arrayBuffer = await e.data.arrayBuffer();
        uint8Data = new Uint8Array(arrayBuffer);
      } else {
        console.error("Unsupported data type:", typeof e.data);
        return;
      }
      
      // Check for telnet protocol if auto-detection is enabled and not already in telnet mode
      if (!AppState.telnetMode && AppState.autoDetectTelnet) {
        detectTelnetProtocol(uint8Data);
      }
      
      // Process with telnet handler if in telnet mode
      if (AppState.telnetMode && AppState.telnetHandler) {
        const processedData = AppState.telnetHandler.processIncoming(uint8Data);
        
        // Write processed data to terminal (after removing telnet commands)
        if (processedData.length > 0) {
          const decodedText = new TextDecoder().decode(processedData);
          term.write(decodedText);
        }
      } else {
        // Not in telnet mode, write directly to terminal
        if (typeof e.data === 'string') {
          term.write(e.data);
        } else {
          const text = new TextDecoder().decode(uint8Data);
          term.write(text);
        }
      }
    };
    
    // Process the data asynchronously
    processData();
  } catch (error) {
    console.error("Error handling socket message:", error);
    // Fallback to ensure something is displayed
    try {
      if (typeof e.data === 'string') {
        term.write(e.data);
      } else if (e.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(new Uint8Array(e.data));
        term.write(text);
      }
    } catch (fallbackError) {
      console.error("Error in fallback terminal write:", fallbackError);
    }
  }
}

/**
 * Detect if the data contains telnet protocol commands with improved deduplication
 * @param {Uint8Array} data The data to examine
 * @return {boolean} True if telnet protocol was detected
 */
function detectTelnetProtocol(data) {
  // Skip empty data check
  if (!data || data.length < 3) {
    return false;
  }
  
  // Log the incoming data for debugging
  if (AppState.debugMode) {
    console.log('Examining data for telnet protocol:', 
                Array.from(data.slice(0, Math.min(30, data.length))),
                data.length > 30 ? `... (${data.length} bytes total)` : '');
  }
  
  // Only detect once per connection
  if (AppState.telnetInitialized) {
    return AppState.telnetMode;
  }
  
  // Look for IAC byte followed by telnet commands
  for (let i = 0; i < data.length - 2; i++) {
    if (data[i] === TelnetCommands.IAC) {
      const command = data[i + 1];
      const option = data[i + 2];
      
      // Check if it's a valid telnet command
      if (command === TelnetCommands.DO || 
          command === TelnetCommands.DONT || 
          command === TelnetCommands.WILL || 
          command === TelnetCommands.WONT ||
          command === TelnetCommands.SB) {
        
        // Log the detected command in a clear, structured way
        const cmdName = command in CommandNames ? CommandNames[command] : `CMD-${command}`;
        const optName = option in OptionNames ? OptionNames[option] : `OPT-${option}`;
        console.log(`✓ TELNET DETECTED: IAC ${cmdName} ${optName} at position ${i}`);
        console.log(`Full sequence: [${data[i]}, ${data[i+1]}, ${data[i+2]}]`);
        
        // Only initialize once
        if (!AppState.telnetInitialized) {
          // Initialize telnet handler if needed
          if (!AppState.telnetHandler) {
            initializeTelnetHandler();
          }
          
          // Enable telnet mode
          AppState.telnetMode = true;
          AppState.telnetInitialized = true;
          
          // Initialize negotiation
          if (AppState.telnetHandler) {
            AppState.telnetHandler.initializeNegotiation();
          }
          
          // Update UI to show telnet mode
          updateTelnetUI(true);
          
          // Show a notification to the user
          showNotification('Telnet protocol detected! Terminal in telnet mode.', 'success');
        }
        
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Send data to socket with telnet protocol handling and deduplication
 * @param {string|Uint8Array} data The data to send
 * @return {boolean} Success or failure
 */
function sendToSocketWithTelnet(data) {
  try {
    if (!AppState.socket || AppState.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // If in telnet mode, special handling might be needed
    if (AppState.telnetMode && AppState.telnetHandler) {
      // For CR, we might need special handling in telnet
      if (typeof data === 'string' && data === '\r') {
        // In telnet, CR should be sent as CR+NUL
        const crData = new Uint8Array([TelnetCommands.CR, TelnetCommands.NUL]);
        if (AppState.debugMode) {
          console.log('Sending CR+NUL sequence for telnet');
        }
        AppState.socket.send(crData);
        return true;
      }
      
      // For LF, might need to send as CR+LF
      if (typeof data === 'string' && data === '\n') {
        const lfData = new Uint8Array([TelnetCommands.CR, TelnetCommands.LF]);
        if (AppState.debugMode) {
          console.log('Sending CR+LF sequence for telnet');
        }
        AppState.socket.send(lfData);
        return true;
      }
      
      // For Enter key (in many browsers), might be sent as single CR
      if (typeof data === 'string' && data === '\r\n') {
        const crlfData = new Uint8Array([TelnetCommands.CR, TelnetCommands.LF]);
        if (AppState.debugMode) {
          console.log('Sending CR+LF sequence for telnet (from CRLF)');
        }
        AppState.socket.send(crlfData);
        return true;
      }
      
      // Escape any IAC bytes in the data
      if (typeof data === 'string') {
        // Convert to byte array for processing
        const bytes = new TextEncoder().encode(data);
        const escaped = escapeIAC(bytes);
        
        if (AppState.debugMode && bytes.length !== escaped.length) {
          console.log(`Escaped ${escaped.length - bytes.length} IAC bytes in outgoing data`);
        }
        
        AppState.socket.send(escaped);
        return true;
      } else if (data instanceof Uint8Array) {
        // Check for telnet commands that need deduplication
        if (data.length >= 3 && data[0] === TelnetCommands.IAC && CommandTracker.wasSentRecently(data)) {
          return true; // Skip sending duplicated commands
        }
        
        const escaped = escapeIAC(data);
        
        if (AppState.debugMode && data.length !== escaped.length) {
          console.log(`Escaped ${escaped.length - data.length} IAC bytes in outgoing binary data`);
        }
        
        AppState.socket.send(escaped);
        return true;
      }
    }
    
    // Not in telnet mode or no special handling needed
    if (AppState.debugMode) {
      if (typeof data === 'string') {
        console.log(`Sending regular text data (${data.length} chars)`);
      } else {
        console.log(`Sending regular binary data (${data.length} bytes)`);
      }
    }
    
    AppState.socket.send(data);
    return true;
  } catch (error) {
    console.error("Error sending to WebSocket:", error);
    return false;
  }
}

/**
 * Escape IAC bytes in data by doubling them
 * @param {Uint8Array} data The data to process
 * @return {Uint8Array} Data with IAC bytes escaped
 */
function escapeIAC(data) {
  // Count IAC bytes to determine new buffer size
  let iacCount = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === TelnetCommands.IAC) {
      iacCount++;
    }
  }
  
  // If no IAC bytes, return original data
  if (iacCount === 0) {
    return data;
  }
  
  // Create new buffer with extra space for doubled IAC bytes
  const result = new Uint8Array(data.length + iacCount);
  let j = 0;
  
  // Copy data, doubling IAC bytes
  for (let i = 0; i < data.length; i++) {
    result[j++] = data[i];
    if (data[i] === TelnetCommands.IAC) {
      result[j++] = TelnetCommands.IAC;  // Double IAC bytes
    }
  }
  
  return result;
}

/**
 * Update the UI to show telnet mode status
 * @param {boolean} isTelnet Whether telnet mode is active
 */
function updateTelnetUI(isTelnet) {
  // Create telnet indicator if it doesn't exist
  if (!Elements.telnetIndicator) {
    const telnetIndicator = document.createElement('div');
    telnetIndicator.className = 'telnet-indicator';
    telnetIndicator.innerHTML = 'TELNET';
    telnetIndicator.style.display = 'none';
    telnetIndicator.style.position = 'absolute';
    telnetIndicator.style.top = '5px';
    telnetIndicator.style.right = '5px';
    telnetIndicator.style.backgroundColor = '#4CAF50';
    telnetIndicator.style.color = 'white';
    telnetIndicator.style.padding = '3px 8px';
    telnetIndicator.style.borderRadius = '4px';
    telnetIndicator.style.fontSize = '12px';
    telnetIndicator.style.fontWeight = 'bold';
    telnetIndicator.style.zIndex = '100';
    
    Elements.statusDisplay.parentNode.appendChild(telnetIndicator);
    Elements.telnetIndicator = telnetIndicator;
  }
  
  // Show/hide telnet indicator
  Elements.telnetIndicator.style.display = isTelnet ? 'block' : 'none';
  
  // If we're in telnet mode, make sure we keep track of terminal dimensions
  if (isTelnet && AppState.telnetHandler) {
    // Get terminal dimensions
    const dimensions = term.rows !== undefined ? 
      { rows: term.rows, cols: term.cols } : 
      { rows: 24, cols: 80 };
    
    // Update telnet handler with dimensions
    AppState.telnetHandler.setDimensions(dimensions.cols, dimensions.rows);
    
    // Create a terminal resize observer if it doesn't exist
    if (!AppState.terminalResizeObserver) {
      AppState.terminalResizeObserver = function() {
        if (AppState.telnetMode && AppState.telnetHandler) {
          const dimensions = term.rows !== undefined ? 
            { rows: term.rows, cols: term.cols } : 
            { rows: 24, cols: 80 };
          
          AppState.telnetHandler.setDimensions(dimensions.cols, dimensions.rows);
        }
      };
      
      // Override the fit function to call our observer
      const originalFit = fitAddon.fit;
      fitAddon.fit = function() {
        originalFit.call(fitAddon);
        if (AppState.terminalResizeObserver) {
          AppState.terminalResizeObserver();
        }
      };
    }
  }
  
  // Update toggle button text if it exists
  if (Elements.telnetModeToggle) {
    Elements.telnetModeToggle.textContent = isTelnet ? 'Disable Telnet' : 'Enable Telnet';
  }
  
  // Add telnet auto-detection toggle if not present
  if (!Elements.telnetAutoDetectCheckbox) {
    createTelnetAutoDetectToggle();
  }
}

/**
 * Create telnet auto-detection toggle UI
 */
function createTelnetAutoDetectToggle() {
  // Skip if already created
  if (Elements.telnetAutoDetectCheckbox) return;
  
  const telnetAutoDetectCheckbox = document.createElement('input');
  telnetAutoDetectCheckbox.type = 'checkbox';
  telnetAutoDetectCheckbox.id = 'telnetAutoDetectToggle';
  telnetAutoDetectCheckbox.checked = AppState.autoDetectTelnet;
  telnetAutoDetectCheckbox.setAttribute('aria-label', 'Auto-detect Telnet protocol');
  
  const telnetAutoDetectLabel = document.createElement('label');
  telnetAutoDetectLabel.htmlFor = 'telnetAutoDetectToggle';
  telnetAutoDetectLabel.textContent = 'Auto-detect Telnet';
  telnetAutoDetectLabel.className = 'telnet-label';
  
  const telnetContainer = document.createElement('div');
  telnetContainer.className = 'telnet-container';
  telnetContainer.setAttribute('role', 'checkbox');
  telnetContainer.setAttribute('aria-checked', AppState.autoDetectTelnet ? 'true' : 'false');
  telnetContainer.appendChild(telnetAutoDetectCheckbox);
  telnetContainer.appendChild(telnetAutoDetectLabel);
  
  // Add the telnet toggle after the echo toggle
  if (Elements.echoContainer) {
    Elements.echoContainer.parentNode.insertBefore(telnetContainer, Elements.echoContainer.nextSibling);
  } else {
    // Fallback insertion
    Elements.terminalElement.parentNode.insertBefore(telnetContainer, Elements.terminalElement.nextSibling);
  }
  
  // Add event listener
  telnetAutoDetectCheckbox.addEventListener('change', (e) => {
    AppState.autoDetectTelnet = e.target.checked;
    telnetContainer.setAttribute('aria-checked', e.target.checked ? 'true' : 'false');
    
    // If turning off, disable telnet mode
    if (!e.target.checked && AppState.telnetMode) {
      AppState.telnetMode = false;
      AppState.telnetInitialized = false;  // Reset initialization status
      updateTelnetUI(false);
    }
    
    // Show notification
    showNotification(`Telnet auto-detection ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
  });
  
  // Store reference
  Elements.telnetAutoDetectCheckbox = telnetAutoDetectCheckbox;
  Elements.telnetContainer = telnetContainer;
}

/**
 * Manually enable telnet mode
 */
function enableTelnetMode() {
  if (!AppState.telnetHandler) {
    initializeTelnetHandler();
  }
  
  AppState.telnetMode = true;
  AppState.telnetInitialized = true;  // Mark as initialized to prevent redundant detection
  AppState.telnetHandler.setDebugMode(AppState.debugMode);
  
  // Reset state before initializing to avoid duplication issues
  if (AppState.telnetHandler.reset) {
    AppState.telnetHandler.reset();
  }
  
  AppState.telnetHandler.initializeNegotiation();
  
  // Update UI
  updateTelnetUI(true);
  showNotification('Telnet mode manually enabled', 'success');
  
  return true;
}

/**
 * Manually disable telnet mode
 */
function disableTelnetMode() {
  AppState.telnetMode = false;
  AppState.telnetInitialized = false;  // Reset initialization status
  
  // Update UI
  updateTelnetUI(false);
  showNotification('Telnet mode disabled', 'info');
  
  return true;
}

/**
 * Create telnet mode manual toggle button
 */
function createTelnetModeToggle() {
  // Skip if already created
  if (Elements.telnetModeToggle) return;
  
  const telnetModeToggle = document.createElement('button');
  telnetModeToggle.id = 'telnetModeToggle';
  telnetModeToggle.className = 'telnet-mode-toggle';
  telnetModeToggle.textContent = AppState.telnetMode ? 'Disable Telnet' : 'Enable Telnet';
  telnetModeToggle.setAttribute('aria-label', 'Toggle Telnet protocol mode');
  
  // Style the button
  telnetModeToggle.style.marginLeft = '10px';
  telnetModeToggle.style.padding = '5px 10px';
  telnetModeToggle.style.background = '#f0f0f0';
  telnetModeToggle.style.border = '1px solid #ccc';
  telnetModeToggle.style.borderRadius = '4px';
  telnetModeToggle.style.cursor = 'pointer';
  
  // Add the button to UI
  if (Elements.telnetContainer) {
    Elements.telnetContainer.appendChild(telnetModeToggle);
  } else if (Elements.echoContainer) {
    Elements.echoContainer.parentNode.insertBefore(telnetModeToggle, Elements.echoContainer.nextSibling);
  } else {
    // Fallback insertion
    Elements.terminalElement.parentNode.insertBefore(telnetModeToggle, Elements.terminalElement.nextSibling);
  }
  
  // Add event listener
  telnetModeToggle.addEventListener('click', () => {
    if (AppState.telnetMode) {
      disableTelnetMode();
      telnetModeToggle.textContent = 'Enable Telnet';
    } else {
      enableTelnetMode();
      telnetModeToggle.textContent = 'Disable Telnet';
    }
  });
  
  // Store reference
  Elements.telnetModeToggle = telnetModeToggle;
}

// Override the original socket message handler
const originalHandleSocketMessage = handleSocketMessage;
window.handleSocketMessage = handleSocketMessageWithTelnet;

// Override the original sendToSocket function
const originalSendToSocket = sendToSocket;
window.sendToSocket = sendToSocketWithTelnet;

// Add connect event listener to initialize telnet handler and reset state
const originalHandleSocketOpen = handleSocketOpen;
window.handleSocketOpen = function(event) {
  // Call original handler
  originalHandleSocketOpen(event);
  
  // Reset telnet state for new connection
  AppState.telnetMode = false;
  AppState.telnetInitialized = false;
  CommandTracker.reset();
  
  // Initialize telnet handler
  initializeTelnetHandler();
  
  // Create UI elements
  setTimeout(() => {
    createTelnetAutoDetectToggle();
    createTelnetModeToggle();
  }, 100);
};

// Add disconnect handler to clean up telnet state
const originalHandleSocketClose = handleSocketClose;
window.handleSocketClose = function(event) {
  // Reset telnet state when connection closes
  AppState.telnetMode = false;
  AppState.telnetInitialized = false;
  
  // Call original handler
  originalHandleSocketClose(event);
};