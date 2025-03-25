// js/telnet-diagnostics.js - Telnet diagnostic tools

/**
 * Dump telnet diagnostic information to console
 */
function dumpTelnetDiagnostics() {
    console.log("=== TELNET DIAGNOSTICS ===");
    
    // Connection status
    console.log("Connection status:", AppState.isConnected ? "Connected" : "Disconnected");
    console.log("Socket ready state:", AppState.socket ? 
      ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][AppState.socket.readyState] : "No socket");
    
    // Telnet status
    console.log("Telnet mode:", AppState.telnetMode ? "Enabled" : "Disabled");
    console.log("Auto-detect telnet:", AppState.autoDetectTelnet ? "Enabled" : "Disabled");
    
    if (AppState.telnetHandler) {
      console.log("Telnet handler created:", "Yes");
      console.log("Telnet options:", AppState.telnetHandler.options);
      
      // Terminal dimensions
      const dimensions = term.rows !== undefined ? 
        { rows: term.rows, cols: term.cols } : 
        { rows: 24, cols: 80 };
      console.log("Terminal dimensions:", dimensions);
    } else {
      console.log("Telnet handler created:", "No");
    }
    
    console.log("=== END DIAGNOSTICS ===");
  }
  
  /**
   * Create diagnostic button
   */
  function createDiagnosticButton() {
    const diagnosticBtn = document.createElement('button');
    diagnosticBtn.textContent = "Telnet Diagnostics";
    diagnosticBtn.className = "diagnostic-btn";
    diagnosticBtn.style.marginLeft = "10px";
    diagnosticBtn.style.backgroundColor = "#f0f0f0";
    diagnosticBtn.style.border = "1px solid #ccc";
    diagnosticBtn.style.borderRadius = "4px";
    diagnosticBtn.style.padding = "5px 10px";
    
    diagnosticBtn.addEventListener('click', () => {
      dumpTelnetDiagnostics();
      
      // Also send an IAC NOP to test telnet communication
      if (AppState.telnetMode && AppState.telnetHandler && AppState.socket && 
          AppState.socket.readyState === WebSocket.OPEN) {
        console.log("Sending IAC NOP for testing");
        const data = new Uint8Array([255, 241]); // IAC NOP
        AppState.socket.send(data);
      }
      
      // Show notification
      showNotification("Telnet diagnostics logged to console", "info");
    });
    
    // Add to UI
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.appendChild(diagnosticBtn);
    }
    
    // Store in Elements
    if (typeof Elements !== 'undefined') {
      Elements.diagnosticBtn = diagnosticBtn;
    }
  }
  
  /**
   * Send a test telnet command sequence
   */
  function sendTestTelnetSequence() {
    if (!AppState.socket || AppState.socket.readyState !== WebSocket.OPEN) {
      console.log("Cannot send test sequence - not connected");
      return false;
    }
    
    console.log("Sending test telnet sequence");
    
    // Send a series of telnet commands to test negotiation
    const commands = [
      // IAC WILL TERMINAL-TYPE
      new Uint8Array([255, 251, 24]),
      
      // IAC WILL NAWS (Window Size)
      new Uint8Array([255, 251, 31]),
      
      // IAC WILL SGA (Suppress Go Ahead)
      new Uint8Array([255, 251, 3]),
      
      // IAC DO SGA (Ask server to suppress go ahead)
      new Uint8Array([255, 253, 3])
    ];
    
    // Send each command with a small delay
    commands.forEach((cmd, index) => {
      setTimeout(() => {
        AppState.socket.send(cmd);
        console.log(`Sent test command ${index + 1}/${commands.length}`);
      }, index * 300);
    });
    
    // Send terminal type after a delay
    setTimeout(() => {
      const termType = "xterm";
      const termBytes = new TextEncoder().encode(termType);
      const data = new Uint8Array(6 + termBytes.length);
      
      // IAC SB TERMINAL-TYPE IS ...terminal-type... IAC SE
      data[0] = 255; // IAC
      data[1] = 250; // SB
      data[2] = 24;  // TERMINAL-TYPE
      data[3] = 0;   // IS
      
      // Copy terminal type bytes
      for (let i = 0; i < termBytes.length; i++) {
        data[4 + i] = termBytes[i];
      }
      
      // End with IAC SE
      data[4 + termBytes.length] = 255; // IAC
      data[5 + termBytes.length] = 240; // SE
      
      AppState.socket.send(data);
      console.log("Sent terminal type:", termType);
    }, commands.length * 300 + 100);
    
    return true;
  }
  
  // Create a "Send Test Sequence" button
  function createTestSequenceButton() {
    const testBtn = document.createElement('button');
    testBtn.textContent = "Send Test Sequence";
    testBtn.className = "test-sequence-btn";
    testBtn.style.marginLeft = "10px";
    testBtn.style.backgroundColor = "#e0e0e0";
    testBtn.style.border = "1px solid #ccc";
    testBtn.style.borderRadius = "4px";
    testBtn.style.padding = "5px 10px";
    
    testBtn.addEventListener('click', () => {
      if (sendTestTelnetSequence()) {
        showNotification("Sent telnet test sequence", "info");
      } else {
        showNotification("Cannot send test sequence - not connected", "error");
      }
    });
    
    // Add to UI
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.appendChild(testBtn);
    }
    
    // Store in Elements
    if (typeof Elements !== 'undefined') {
      Elements.testSequenceBtn = testBtn;
    }
  }
  
  // Add to initialization
  window.addEventListener('load', () => {
    setTimeout(() => {
      createDiagnosticButton();
      createTestSequenceButton();
    }, 1000);
  });