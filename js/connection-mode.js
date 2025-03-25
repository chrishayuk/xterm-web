// js/connection-mode.js - Enhanced direct connection option

/**
 * Create direct connection toggle UI with improved styling
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
  
  // Find where to insert the toggle
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
      
      // Focus on the WebSocket path input if it's now visible
      if (useDirectConnection && Elements.wsPathInput) {
        setTimeout(() => Elements.wsPathInput.focus(), 100);
      }
    }
    
    // Show appropriate message with enhanced styling
    if (useDirectConnection) {
      showNotification('Direct WebSocket connection mode enabled', 'success');
    } else {
      showNotification('Proxy connection mode enabled', 'info');
    }
  });
  
  // Store in Elements
  Elements.directConnectionCheckbox = directConnectionCheckbox;
  Elements.directConnectionContainer = container;
  
  return container;
}

/**
 * Initialize WebSocket path field with improved validation and UX
 */
function initWebSocketPathField() {
  // Find the WebSocket path input
  const wsPathInput = document.getElementById('wsPath');
  if (!wsPathInput) {
    return;
  }
  
  // Store in Elements
  Elements.wsPathInput = wsPathInput;
  
  // Add event listener for path validation with improved UX
  wsPathInput.addEventListener('change', (e) => {
    let path = e.target.value.trim();
    
    // Make sure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
      
      // Show notification about the automatic fix
      showNotification('Path must start with / - automatically fixed', 'info');
    }
    
    // Update input value
    e.target.value = path;
    
    // Also update AppState to ensure reconnection uses the correct path
    if (typeof AppState !== 'undefined') {
      AppState.lastWsPath = path;
    }
  });
  
  // Add placeholder text for better UX
  wsPathInput.placeholder = '/path (e.g., /ws or /stocks)';
  
  // Add tooltip for the path input
  const wsPathLabel = document.querySelector('label[for="wsPath"]');
  if (wsPathLabel) {
    wsPathLabel.title = 'The endpoint path on your server (e.g., /ws, /stocks)';
    wsPathLabel.style.cursor = 'help';
  }
}

/**
 * Create enhanced notification for connection status
 * @param {string} message The message to display
 * @param {string} type The notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.terminal-notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });
  
  // Create new notification
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `terminal-notification ${type}`;
  
  // Add an icon based on type
  const iconSpan = document.createElement('span');
  iconSpan.className = 'notification-icon';
  
  let icon = '•';
  switch (type) {
    case 'success':
      icon = '✓';
      break;
    case 'error':
      icon = '✗';
      break;
    case 'warning':
      icon = '⚠';
      break;
    case 'info':
      icon = 'ℹ';
      break;
  }
  
  iconSpan.textContent = icon + ' ';
  notification.insertBefore(iconSpan, notification.firstChild);
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 4000);
  
  return notification;
}

// Initialize on load
if (typeof window.addEventListener === 'function') {
  window.addEventListener('load', () => {
    if (typeof AppState !== 'undefined') {
      // Add direct connection property to AppState
      AppState.useDirectConnection = false;
      AppState.lastUseDirectConnection = false;
      AppState.lastWsPath = '/ws';
      
      // Initialize WebSocket path field
      initWebSocketPathField();
      
      // Export showNotification globally for use by other modules
      window.showNotification = showNotification;
    }
  });
}