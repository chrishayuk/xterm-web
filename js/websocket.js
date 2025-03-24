// js/websocket.js - WebSocket connection handling with server detection

// Connect to the WebSocket server
function connectToWebSocket() {
  const host = Elements.hostInput.value.trim();
  const port = Elements.portInput.value.trim();
  const proxyPort = Elements.proxyPortInput.value.trim();
  
  if (!host || !port) {
    updateStatus('Error: Host and port are required', 'error');
    return false;
  }
  
  // Reset server detection flags
  isStockServer = false;
  detectionComplete = false;
  
  // Construct the WebSocket URL including the target query parameter
  const wsUrl = `ws://localhost:${proxyPort}/?target=${encodeURIComponent(host + ":" + port)}`;
  console.log("Connecting to:", wsUrl);
  
  // Update UI
  updateStatus('Connecting...', 'connecting');
  Elements.targetDisplay.textContent = `${host}:${port}`;
  
  // Always clear terminal on connect/reconnect
  term.clear();
  Elements.commandInput.value = '';
  
  // Close existing socket if any
  if (AppState.socket) {
    AppState.socket.close();
    AppState.socket = null;
  }
  
  // Create WebSocket connection
  try {
    AppState.socket = new WebSocket(wsUrl);
    
    AppState.socket.addEventListener("open", (event) => {
      console.log("WebSocket connection opened.");
      updateStatus('Connected', 'connected');
      toggleConnectionControls(true);
      AppState.isConnected = true;
      
      // Check for known hosts and set server type in advance
      if (host.includes("stockfeed") || port === "8888") {
        setServerType('stock');
      }
      
      // Set focus to terminal after connection
      setTimeout(() => {
        focusTerminal();
      }, 100);
    });
    
    AppState.socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      updateStatus('Connection error', 'error');
      toggleConnectionControls(false);
      AppState.isConnected = false;
    });
    
    AppState.socket.addEventListener("close", (event) => {
      console.log("WebSocket connection closed.", event);
      updateStatus('Disconnected', 'disconnected');
      toggleConnectionControls(false);
      AppState.isConnected = false;
    });
    
    AppState.socket.addEventListener("message", (e) => {
      console.log("Received data from WebSocket:", e.data);
      term.write(e.data);
      
      // Try to detect server type from received data
      detectServerType(e.data);
    });
    
    return true;
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    updateStatus('Connection failed', 'error');
    AppState.isConnected = false;
    return false;
  }
}

// Disconnect from the WebSocket server
function disconnectFromWebSocket() {
  if (AppState.socket) {
    AppState.socket.close();
    AppState.socket = null;
  }
  AppState.isConnected = false;
}