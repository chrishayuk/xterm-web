// js/telnet-enhancements.js - Enhanced telnet UI elements

/**
 * Create enhanced telnet auto-detection toggle
 */
function createEnhancedTelnetAutoDetectToggle() {
    // Skip if already created
    if (Elements.telnetAutoDetectCheckbox) return;
  
    const telnetAutoDetectCheckbox = document.createElement('input');
    telnetAutoDetectCheckbox.type = 'checkbox';
    telnetAutoDetectCheckbox.id = 'telnetAutoDetectToggle';
    telnetAutoDetectCheckbox.checked = AppState.autoDetectTelnet || true;
    telnetAutoDetectCheckbox.setAttribute('aria-label', 'Auto-detect Telnet protocol');
    
    const telnetAutoDetectLabel = document.createElement('label');
    telnetAutoDetectLabel.htmlFor = 'telnetAutoDetectToggle';
    telnetAutoDetectLabel.textContent = 'Auto-detect Telnet';
    telnetAutoDetectLabel.className = 'telnet-label';
    
    const telnetContainer = document.createElement('div');
    telnetContainer.className = 'telnet-container';
    telnetContainer.setAttribute('role', 'checkbox');
    telnetContainer.setAttribute('aria-checked', AppState.autoDetectTelnet ? 'true' : 'false');
    
    // Create icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'telnet-icon';
    iconSpan.innerHTML = '🔍'; // Magnifying glass icon
    
    telnetContainer.appendChild(iconSpan);
    telnetContainer.appendChild(telnetAutoDetectCheckbox);
    telnetContainer.appendChild(telnetAutoDetectLabel);
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'telnet-tooltip';
    tooltip.textContent = 'Automatically detect and enable telnet protocol features';
    telnetContainer.appendChild(tooltip);
    
    // Add to the page in a more prominent position
    const echoContainer = Elements.echoContainer;
    if (echoContainer && echoContainer.parentNode) {
      echoContainer.parentNode.insertBefore(telnetContainer, echoContainer);
    } else {
      // Fallback insertion
      const terminalElement = Elements.terminalElement;
      if (terminalElement && terminalElement.parentNode) {
        terminalElement.parentNode.insertBefore(telnetContainer, terminalElement.nextSibling);
      }
    }
    
    // Enhanced event listener
    telnetAutoDetectCheckbox.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      AppState.autoDetectTelnet = isEnabled;
      telnetContainer.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
      
      // Apply active/inactive styling
      telnetContainer.classList.toggle('active', isEnabled);
      
      // If turning off, disable telnet mode with animated notification
      if (!isEnabled && AppState.telnetMode) {
        AppState.telnetMode = false;
        AppState.telnetInitialized = false;  // Reset initialization status
        updateTelnetUI(false);
        
        // Show animated notification
        showNotification(`Telnet auto-detection ${isEnabled ? 'enabled' : 'disabled'}`, isEnabled ? 'success' : 'info');
      } else {
        showNotification(`Telnet auto-detection ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
      }
    });
    
    // Store reference
    Elements.telnetAutoDetectCheckbox = telnetAutoDetectCheckbox;
    Elements.telnetContainer = telnetContainer;
    
    return telnetContainer;
  }
  
  /**
   * Create an enhanced telnet mode toggle button
   */
  function createEnhancedTelnetModeToggle() {
    // Skip if already created
    if (Elements.telnetModeToggle) return;
    
    const telnetModeToggle = document.createElement('button');
    telnetModeToggle.id = 'telnetModeToggle';
    telnetModeToggle.className = 'telnet-mode-toggle';
    telnetModeToggle.textContent = AppState.telnetMode ? 'Disable Telnet' : 'Enable Telnet';
    telnetModeToggle.setAttribute('aria-label', 'Toggle Telnet protocol mode');
    
    // Style the button with icon
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toggle-icon';
    iconSpan.innerHTML = AppState.telnetMode ? '🔴' : '🟢';
    telnetModeToggle.insertBefore(iconSpan, telnetModeToggle.firstChild);
    
    // Add the button to the telnet container
    if (Elements.telnetContainer) {
      Elements.telnetContainer.appendChild(telnetModeToggle);
    } else if (Elements.echoContainer) {
      Elements.echoContainer.parentNode.insertBefore(telnetModeToggle, Elements.echoContainer.nextSibling);
    } else {
      // Fallback insertion
      Elements.terminalElement.parentNode.insertBefore(telnetModeToggle, Elements.terminalElement.nextSibling);
    }
    
    // Add enhanced event listener with animation
    telnetModeToggle.addEventListener('click', () => {
      telnetModeToggle.classList.add('clicked');
      
      setTimeout(() => {
        telnetModeToggle.classList.remove('clicked');
        
        if (AppState.telnetMode) {
          disableTelnetMode();
          telnetModeToggle.innerHTML = '<span class="toggle-icon">🟢</span> Enable Telnet';
        } else {
          enableTelnetMode();
          telnetModeToggle.innerHTML = '<span class="toggle-icon">🔴</span> Disable Telnet';
        }
      }, 200);
    });
    
    // Store reference
    Elements.telnetModeToggle = telnetModeToggle;
    
    return telnetModeToggle;
  }
  
  /**
   * Update the enhanced telnet indicator UI
   * @param {boolean} isTelnet Whether telnet mode is active
   */
  function updateEnhancedTelnetUI(isTelnet) {
    // Create telnet indicator with animation if it doesn't exist
    if (!Elements.telnetIndicator) {
      const telnetIndicator = document.createElement('div');
      telnetIndicator.className = 'telnet-indicator';
      telnetIndicator.innerHTML = '<span class="indicator-icon">📟</span> TELNET';
      telnetIndicator.style.display = 'none';
      
      // Add a pulse animation for new indicator
      telnetIndicator.style.animation = 'pulse 2s infinite';
      
      // Create keyframes for pulse animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .clicked {
          transform: scale(0.95);
          transition: transform 0.1s ease;
        }
        
        .telnet-icon, .toggle-icon {
          display: inline-block;
          margin-right: 5px;
        }
        
        .telnet-tooltip {
          position: absolute;
          top: -30px;
          left: 0;
          background-color: #333;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          white-space: nowrap;
          z-index: 100;
        }
        
        .telnet-container:hover .telnet-tooltip {
          opacity: 1;
        }
        
        .telnet-container.active {
          background-color: rgba(74, 222, 128, 0.2);
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
      `;
      document.head.appendChild(style);
      
      Elements.statusDisplay.parentNode.appendChild(telnetIndicator);
      Elements.telnetIndicator = telnetIndicator;
    }
    
    // Show/hide telnet indicator with animation
    if (isTelnet) {
      Elements.telnetIndicator.style.display = 'block';
      // Add entrance animation
      Elements.telnetIndicator.classList.add('telnet-active');
    } else {
      Elements.telnetIndicator.classList.remove('telnet-active');
      // Fade out before hiding
      Elements.telnetIndicator.style.opacity = '0';
      setTimeout(() => {
        Elements.telnetIndicator.style.display = 'none';
        Elements.telnetIndicator.style.opacity = '1';
      }, 300);
    }
    
    // Update toggle button text and icon if it exists
    if (Elements.telnetModeToggle) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'toggle-icon';
      iconSpan.innerHTML = isTelnet ? '🔴' : '🟢';
      
      Elements.telnetModeToggle.innerHTML = '';
      Elements.telnetModeToggle.appendChild(iconSpan);
      Elements.telnetModeToggle.appendChild(document.createTextNode(isTelnet ? 'Disable Telnet' : 'Enable Telnet'));
    }
    
    // Update telnet container with active class if it exists
    if (Elements.telnetContainer) {
      Elements.telnetContainer.classList.toggle('active', isTelnet);
    }
    
    // If we're in telnet mode, make sure we track terminal dimensions
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
    
    // Add telnet auto-detection toggle if not present
    if (!Elements.telnetAutoDetectCheckbox) {
      createEnhancedTelnetAutoDetectToggle();
    }
    
    // Add telnet mode toggle if not present
    if (!Elements.telnetModeToggle) {
      createEnhancedTelnetModeToggle();
    }
  }
  
  /**
   * Enhanced version of enabling telnet mode
   */
  function enableEnhancedTelnetMode() {
    if (!AppState.telnetHandler) {
      initializeTelnetHandler();
    }
    
    AppState.telnetMode = true;
    AppState.telnetInitialized = true;
    AppState.telnetHandler.setDebugMode(AppState.debugMode);
    
    // Reset state before initializing to avoid duplication issues
    if (AppState.telnetHandler.reset) {
      AppState.telnetHandler.reset();
    }
    
    AppState.telnetHandler.initializeNegotiation();
    
    // Update UI with animation
    updateEnhancedTelnetUI(true);
    showNotification('Telnet mode enabled', 'success');
    
    return true;
  }
  
  /**
   * Enhanced version of disabling telnet mode
   */
  function disableEnhancedTelnetMode() {
    AppState.telnetMode = false;
    AppState.telnetInitialized = false;
    
    // Update UI with animation
    updateEnhancedTelnetUI(false);
    showNotification('Telnet mode disabled', 'info');
    
    return true;
  }
  
  // Override the existing functions with enhanced versions
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Store original functions
      const originalUpdateTelnetUI = window.updateTelnetUI;
      const originalEnableTelnetMode = window.enableTelnetMode;
      const originalDisableTelnetMode = window.disableTelnetMode;
      
      // Override with enhanced versions
      window.updateTelnetUI = updateEnhancedTelnetUI;
      window.enableTelnetMode = enableEnhancedTelnetMode;
      window.disableTelnetMode = disableEnhancedTelnetMode;
      
      // Export new functions
      window.createEnhancedTelnetAutoDetectToggle = createEnhancedTelnetAutoDetectToggle;
      window.createEnhancedTelnetModeToggle = createEnhancedTelnetModeToggle;
    });
  }