// js/websocket.js - WebSocket connection handling with binary data support

// Connection tracking variables
let connectionTimer = null;
let reconnectTimer = null;

/**
 * Connect to the WebSocket server
 * @param {boolean} isReconnect Whether this is a reconnection attempt
 * @return {boolean} True if connection attempt started
 */
function connectToWebSocket(isReconnect = false) {
    // Get connection parameters
    const host = isReconnect ? AppState.lastHost : Elements.hostInput.value.trim();
    const port = isReconnect ? AppState.lastPort : Elements.portInput.value.trim();
    const proxyPort = isReconnect ? AppState.lastProxyPort : Elements.proxyPortInput.value.trim();
    
    // Validate inputs
    if (!host || !port) {
      updateStatus('Error: Host and port are required', 'error');
      return false;
    }
    
    // Save values for potential reconnection
    AppState.lastHost = host;
    AppState.lastPort = port;
    AppState.lastProxyPort = proxyPort;
    
    // Construct the WebSocket URL including the target query parameter
    const wsUrl = `ws://localhost:${proxyPort}/?target=${encodeURIComponent(host + ":" + port)}`;
    console.log(`${isReconnect ? 'Reconnecting' : 'Connecting'} to:`, wsUrl);
    
    // Update UI
    updateStatus(`${isReconnect ? 'Reconnecting' : 'Connecting'}...`, 'connecting');
    Elements.targetDisplay.textContent = `${host}:${port}`;
    
    // Always clear terminal on connect/reconnect
    term.clear();
    Elements.commandInput.value = '';
    lineBuffer = ''; // Clear any existing line buffer
    
    // Close existing socket if any
    if (AppState.socket) {
      try {
        AppState.socket.close();
      } catch (e) {
        console.error("Error closing existing socket:", e);
      }
      AppState.socket = null;
    }
    
    // Clear any existing timers
    if (connectionTimer) {
      clearTimeout(connectionTimer);
      connectionTimer = null;
    }
    
    // Create WebSocket connection
    try {
      AppState.socket = new WebSocket(wsUrl);
      
      // Configure WebSocket for binary data
      AppState.socket.binaryType = 'arraybuffer';
      console.log("WebSocket created with binary type: arraybuffer");
      
      // Set connection timeout
      connectionTimer = setTimeout(() => {
        if (AppState.socket && AppState.socket.readyState !== WebSocket.OPEN) {
          console.log("Connection timeout reached");
          
          try {
            AppState.socket.close();
          } catch (e) {
            console.error("Error closing timed out socket:", e);
          }
          
          AppState.socket = null;
          updateStatus('Connection timeout', 'error');
          toggleConnectionControls(false);
          AppState.isConnected = false;
          
          // Try to reconnect if needed
          handleReconnect();
        }
      }, AppConstants.CONNECTION_TIMEOUT);
      
      // Setup event listeners
      AppState.socket.addEventListener("open", handleSocketOpen);
      AppState.socket.addEventListener("error", handleSocketError);
      AppState.socket.addEventListener("close", handleSocketClose);
      AppState.socket.addEventListener("message", handleSocketMessage);
      
      return true;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      updateStatus('Connection failed', 'error');
      AppState.isConnected = false;
      
      // Try to reconnect if needed
      handleReconnect();
      
      return false;
    }
}

/**
 * Handle socket open event
 * @param {Event} event The open event
 */
function handleSocketOpen(event) {
  console.log("WebSocket connection opened.");
  
  // Clear connection timeout
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  
  // Reset reconnect attempts on successful connection
  AppState.reconnectAttempts = 0;
  
  updateStatus('Connected', 'connected');
  toggleConnectionControls(true);
  AppState.isConnected = true;
  
  // Set focus to terminal after connection
  setTimeout(() => {
    focusTerminal();
  }, 100);
}

/**
 * Handle socket error event
 * @param {Event} error The error event
 */
function handleSocketError(error) {
  console.error("WebSocket error:", error);
  updateStatus('Connection error', 'error');
  
  // Don't change UI state here as the close event will follow
}

/**
 * Handle socket close event
 * @param {CloseEvent} event The close event
 */
function handleSocketClose(event) {
  console.log("WebSocket connection closed.", event);
  
  // Clear connection timeout if it exists
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  
  // Only update UI if we were previously connected
  if (AppState.isConnected) {
    updateStatus('Disconnected', 'disconnected');
    toggleConnectionControls(false);
    AppState.isConnected = false;
    
    // Try to reconnect if it was an abnormal closure
    if (event.code !== 1000 && event.code !== 1001) {
      handleReconnect();
    }
  }
  
  // Remove event listeners to prevent memory leaks
  if (AppState.socket) {
    AppState.socket.removeEventListener("open", handleSocketOpen);
    AppState.socket.removeEventListener("error", handleSocketError);
    AppState.socket.removeEventListener("close", handleSocketClose);
    AppState.socket.removeEventListener("message", handleSocketMessage);
    AppState.socket = null;
  }
}

/**
 * Handle socket message event
 * @param {MessageEvent} e The message event
 */
function handleSocketMessage(e) {
  try {
    // Log received data type for debugging
    if (e.data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(e.data);
      console.log(`Received binary data from WebSocket (${bytes.length} bytes)`);
      
      // Check if there might be telnet commands for debugging
      let hasIAC = false;
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] === 255) { // IAC byte
          hasIAC = true;
          break;
        }
      }
      
      if (hasIAC && bytes.length >= 3) {
        console.log("Data contains possible telnet commands:", Array.from(bytes.slice(0, Math.min(20, bytes.length))));
      }
    } else {
      console.log(`Received text data from WebSocket: ${e.data.substring(0, 50)}${e.data.length > 50 ? '...' : ''}`);
    }
    
    // The actual message handling is delegated to telnet-integration.js
    // which has overridden the global handleSocketMessage function
    // But we'll write to terminal directly here as a fallback
    if (!window.handleSocketMessageWithTelnet) {
      console.log("Using fallback message handler");
      term.write(e.data);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

/**
 * Send data to WebSocket with format conversion if needed
 * @param {string|Uint8Array|ArrayBuffer} data The data to send
 * @return {boolean} Success or failure
 */
function sendToSocket(data) {
  try {
    if (AppState.socket && AppState.socket.readyState === WebSocket.OPEN) {
      // If data is a string, convert to binary for telnet
      if (typeof data === 'string') {
        console.log(`Sending text data: ${data.length <= 50 ? data : data.substring(0, 50) + '...'}`);
      } else if (data instanceof Uint8Array) {
        console.log(`Sending binary data (${data.length} bytes)`);
      } else if (data instanceof ArrayBuffer) {
        console.log(`Sending ArrayBuffer (${data.byteLength} bytes)`);
      }
      
      // Send as-is - the telnet-integration.js module will override this function
      // with one that has proper telnet protocol handling
      AppState.socket.send(data);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending to WebSocket:", error);
    return false;
  }
}

/**
 * Attempt to reconnect to the server
 */
function handleReconnect() {
  if (AppState.reconnectAttempts < AppState.maxReconnectAttempts) {
    AppState.reconnectAttempts++;
    
    // Calculate delay: 1s, 2s, 4s (exponential backoff)
    const delay = Math.pow(2, AppState.reconnectAttempts - 1) * 1000;
    
    console.log(`Reconnect attempt ${AppState.reconnectAttempts}/${AppState.maxReconnectAttempts} scheduled in ${delay}ms`);
    updateStatus(`Reconnecting in ${delay/1000}s... (${AppState.reconnectAttempts}/${AppState.maxReconnectAttempts})`, 'connecting');
    
    // Schedule reconnection
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    
    reconnectTimer = setTimeout(() => {
      connectToWebSocket(true);
    }, delay);
  } else {
    console.log("Max reconnect attempts reached");
    updateStatus('Connection failed after multiple attempts', 'error');
  }
}

/**
 * Disconnect from the WebSocket server
 */
function disconnectFromWebSocket() {
  // Clear any reconnect timers
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // Reset reconnect attempts
  AppState.reconnectAttempts = 0;
  
  // Close socket if open
  if (AppState.socket) {
    try {
      AppState.socket.close(1000, "User disconnected");
    } catch (e) {
      console.error("Error closing WebSocket:", e);
    }
    
    // Remove event listeners
    AppState.socket.removeEventListener("open", handleSocketOpen);
    AppState.socket.removeEventListener("error", handleSocketError);
    AppState.socket.removeEventListener("close", handleSocketClose);
    AppState.socket.removeEventListener("message", handleSocketMessage);
    
    AppState.socket = null;
  }
  
  AppState.isConnected = false;
  updateStatus('Disconnected', 'disconnected');
  toggleConnectionControls(false);
}

/**
 * Force close and cleanup sockets before page unload
 */
function cleanupSockets() {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  if (AppState.socket) {
    try {
      AppState.socket.close();
    } catch (e) {
      console.error("Error closing socket during cleanup:", e);
    }
  }
}

// Add cleanup handler
window.addEventListener('beforeunload', cleanupSockets);