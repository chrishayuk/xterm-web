// js/connection-mode.js - Direct connection option with WebSocket path support

/**
 * Create direct connection toggle UI
 */
function createDirectConnectionToggle() {
    // Skip if already created
    if (Elements.directConnectionCheckbox) return;
  
    const directConnectionCheckbox = document.createElement('input');
    directConnectionCheckbox.type = 'checkbox';
    directConnectionCheckbox.id = 'directConnectionToggle';
    directConnectionCheckbox.checked = false;
    directConnectionCheckbox.setAttribute('aria-label', 'Use direct WebSocket connection');
    
    const directConnectionLabel = document.createElement('label');
    directConnectionLabel.htmlFor = 'directConnectionToggle';
    directConnectionLabel.textContent = 'Direct WebSocket Connection';
    directConnectionLabel.className = 'connection-mode-label';
    
    const container = document.createElement('div');
    container.className = 'connection-mode-container';
    container.setAttribute('role', 'checkbox');
    container.setAttribute('aria-checked', 'false');
    container.appendChild(directConnectionCheckbox);
    container.appendChild(directConnectionLabel);
    
    // Add tooltip explaining the option
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = 'Connect directly to a server that supports WebSockets, bypassing the proxy';
    container.appendChild(tooltip);
    
    // Add to the form before the buttons
    const connectionForm = document.getElementById('connectionForm');
    const proxyPortGroup = Elements.proxyPortInput.closest('.form-group');
    
    // Insert after the proxy port input
    if (proxyPortGroup && proxyPortGroup.nextSibling) {
      connectionForm.insertBefore(container, proxyPortGroup.nextSibling);
    } else {
      // Fallback insertion
      connectionForm.appendChild(container);
    }
    
    // Add event listener
    directConnectionCheckbox.addEventListener('change', (e) => {
      const useDirectConnection = e.target.checked;
      container.setAttribute('aria-checked', useDirectConnection ? 'true' : 'false');
      
      // Toggle visibility of proxy port input
      const proxyPortGroup = Elements.proxyPortInput.closest('.form-group');
      if (proxyPortGroup) {
        proxyPortGroup.style.opacity = useDirectConnection ? '0.5' : '1';
        proxyPortGroup.style.pointerEvents = useDirectConnection ? 'none' : 'auto';
      }
      
      // Toggle visibility of WebSocket path input
      const wsPathGroup = document.querySelector('.form-group.ws-path');
      if (wsPathGroup) {
        wsPathGroup.style.display = useDirectConnection ? 'flex' : 'none';
      }
      
      // Show appropriate message
      if (useDirectConnection) {
        showNotification('Direct WebSocket connection mode enabled. Proxy will be bypassed.', 'info');
      } else {
        showNotification('Proxy connection mode enabled. All connections will go through the proxy.', 'info');
      }
    });
    
    // Store in Elements
    Elements.directConnectionCheckbox = directConnectionCheckbox;
    Elements.directConnectionContainer = container;
    
    return container;
  }
  
  /**
   * Initialize WebSocket path field
   */
  function initWebSocketPathField() {
    // Find the WebSocket path input
    const wsPathInput = document.getElementById('wsPath');
    if (!wsPathInput) {
      return;
    }
    
    // Store in Elements
    Elements.wsPathInput = wsPathInput;
    
    // Add event listener for path validation
    wsPathInput.addEventListener('change', (e) => {
      let path = e.target.value.trim();
      
      // Make sure path starts with /
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Update input value
      e.target.value = path;
    });
  }
  
  // Initialize on load
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('load', () => {
      if (typeof AppState !== 'undefined') {
        // Add direct connection property to AppState
        AppState.useDirectConnection = false;
        AppState.lastUseDirectConnection = false;
        AppState.lastWsPath = '/stocks';
        
        // Initialize WebSocket path field
        initWebSocketPathField();
      }
    });
  }