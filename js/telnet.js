// js/telnet.js - Telnet protocol handling

/**
 * Telnet Protocol Constants
 */
const TelnetCommands = {
  // Telnet command codes
  IAC: 255,  // Interpret As Command
  DONT: 254,
  DO: 253,
  WONT: 252,
  WILL: 251,
  SB: 250,   // Subnegotiation Begin
  SE: 240,   // Subnegotiation End
  
  // Telnet control codes
  NUL: 0,    // NULL
  LF: 10,    // Line Feed
  CR: 13,    // Carriage Return
  BS: 8,     // Backspace
  DEL: 127,  // Delete
  CTRL_C: 3, // Ctrl+C
  
  // Telnet option codes
  OPT_ECHO: 1,         // Echo
  OPT_SGA: 3,          // Suppress Go Ahead
  OPT_STATUS: 5,       // Status
  OPT_TIMING: 6,       // Timing Mark
  OPT_TERMINAL: 24,    // Terminal Type
  OPT_NAWS: 31,        // Window Size
  OPT_TSPEED: 32,      // Terminal Speed
  OPT_LINEMODE: 34,    // Line Mode
  OPT_ENVIRON: 36,     // Environment Variables
  OPT_NEW_ENVIRON: 39, // New Environment Variables
  
  // Terminal type query
  TERMINAL_SEND: 1,    // Send terminal type
  TERMINAL_IS: 0       // Terminal type is
};

/**
 * Option and command names for logging
 */
const OptionNames = {
  [TelnetCommands.OPT_ECHO]: "ECHO",
  [TelnetCommands.OPT_SGA]: "SGA",
  [TelnetCommands.OPT_STATUS]: "STATUS",
  [TelnetCommands.OPT_TIMING]: "TIMING-MARK",
  [TelnetCommands.OPT_TERMINAL]: "TERMINAL-TYPE",
  [TelnetCommands.OPT_NAWS]: "NAWS",
  [TelnetCommands.OPT_TSPEED]: "TERMINAL-SPEED",
  [TelnetCommands.OPT_LINEMODE]: "LINEMODE",
  [TelnetCommands.OPT_ENVIRON]: "ENVIRON",
  [TelnetCommands.OPT_NEW_ENVIRON]: "NEW-ENVIRON"
};

const CommandNames = {
  [TelnetCommands.DO]: "DO",
  [TelnetCommands.DONT]: "DONT",
  [TelnetCommands.WILL]: "WILL",
  [TelnetCommands.WONT]: "WONT",
  [TelnetCommands.SB]: "SB",
  [TelnetCommands.SE]: "SE"
};

/**
 * Track negotiated options to prevent duplicate processing
 */
class NegotiationTracker {
  constructor() {
    // Track which command-option pairs have been processed recently
    this.recentCommands = new Map();
    
    // Minimum delay between repeated negotiations (in milliseconds)
    this.dedupWindow = 1000;
    
    // Track which options have been enabled/disabled
    this.optionState = new Map();
  }
  
  /**
   * Generate a key for the command-option pair
   * @param {number} command The telnet command (DO, DONT, WILL, WONT)
   * @param {number} option The option code
   * @return {string} A unique key for this command-option pair
   */
  getKey(command, option) {
    return `${command}-${option}`;
  }
  
  /**
   * Check if a command was recently processed
   * @param {number} command The telnet command (DO, DONT, WILL, WONT)
   * @param {number} option The option code
   * @return {boolean} True if this command was recently processed
   */
  isRecentlyProcessed(command, option) {
    const key = this.getKey(command, option);
    
    if (this.recentCommands.has(key)) {
      const timestamp = this.recentCommands.get(key);
      const now = Date.now();
      
      // If processed within the deduplication window, skip it
      if (now - timestamp < this.dedupWindow) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Mark a command as processed
   * @param {number} command The telnet command (DO, DONT, WILL, WONT)
   * @param {number} option The option code
   */
  markProcessed(command, option) {
    const key = this.getKey(command, option);
    this.recentCommands.set(key, Date.now());
    
    // Set option state
    const stateKey = this.getOptionStateKey(command, option);
    this.optionState.set(stateKey, true);
  }
  
  /**
   * Get a key for tracking option state
   * @param {number} command The telnet command
   * @param {number} option The option code
   * @return {string} A key for tracking option state
   */
  getOptionStateKey(command, option) {
    const type = (command === TelnetCommands.WILL || command === TelnetCommands.WONT) 
      ? 'remote' : 'local';
    const state = (command === TelnetCommands.WILL || command === TelnetCommands.DO)
      ? 'enabled' : 'disabled';
    
    return `${type}-${option}-${state}`;
  }
  
  /**
   * Clean up old entries
   */
  cleanupOldEntries() {
    const now = Date.now();
    for (const [key, timestamp] of this.recentCommands.entries()) {
      if (now - timestamp > this.dedupWindow) {
        this.recentCommands.delete(key);
      }
    }
  }
  
  /**
   * Reset the tracker
   */
  reset() {
    this.recentCommands.clear();
    this.optionState.clear();
  }
}

/**
 * Class to handle telnet protocol negotiation
 */
class TelnetHandler {
  /**
   * Initialize the telnet handler
   * @param {function} sendCallback Function to call when sending data
   * @param {boolean} debugMode Whether to log debug information
   */
  constructor(sendCallback, debugMode = false) {
    this.buffer = new Uint8Array(0);
    this.sendCallback = sendCallback;
    this.debugMode = debugMode;
    
    // Negotiation state tracking
    this.options = {
      [TelnetCommands.OPT_ECHO]: false,
      [TelnetCommands.OPT_SGA]: false,
      [TelnetCommands.OPT_NAWS]: false,
      [TelnetCommands.OPT_TERMINAL]: false,
      [TelnetCommands.OPT_LINEMODE]: false
    };
    
    // State for IAC command processing
    this.state = {
      IAC: false,
      COMMAND: null,
      SUBNEG: false,
      SUBNEG_OPTION: null,
      subnegBuffer: []
    };
    
    // Terminal information
    this.terminalType = 'xterm';
    this.terminalWidth = 80;
    this.terminalHeight = 24;
    
    // Initialize command deduplication tracker
    this.negotiationTracker = new NegotiationTracker();
    
    // Track initialization state
    this.isInitialized = false;
  }
  
  /**
   * Set debug mode
   * @param {boolean} enabled Whether debug mode is enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
  
  /**
   * Set terminal dimensions
   * @param {number} width Terminal width in columns
   * @param {number} height Terminal height in rows
   */
  setDimensions(width, height) {
    this.terminalWidth = width;
    this.terminalHeight = height;
    
    // Send NAWS update if this option is enabled
    if (this.options[TelnetCommands.OPT_NAWS]) {
      this.sendWindowSize();
    }
  }
  
  /**
   * Log debug information if debug mode is enabled
   * @param {string} message The message to log
   * @param {any} data Optional data to include
   */
  debug(message, data = null) {
    if (this.debugMode) {
      if (data !== null) {
        console.log(`[Telnet] ${message}`, data);
      } else {
        console.log(`[Telnet] ${message}`);
      }
    }
  }
  
  /**
   * Get option name for logging
   * @param {number} option Option code
   * @return {string} Human-readable option name
   */
  getOptionName(option) {
    return OptionNames[option] || `UNKNOWN-OPTION-${option}`;
  }
  
  /**
   * Get command name for logging
   * @param {number} command Command code
   * @return {string} Human-readable command name
   */
  getCommandName(command) {
    return CommandNames[command] || `UNKNOWN-COMMAND-${command}`;
  }
  
  /**
   * Process incoming telnet data
   * @param {Uint8Array|string} data The data to process
   * @return {Uint8Array} Processed data with telnet commands removed
   */
  processIncoming(data) {
    // Ensure data is a Uint8Array
    let bytes;
    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data);
    } else {
      bytes = new Uint8Array(data);
    }
    
    const result = [];
    
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      
      // Handle IAC sequences
      if (this.state.IAC) {
        if (this.state.COMMAND === null) {
          // This byte is the command (DO, DONT, WILL, WONT, SB, etc.)
          this.state.COMMAND = byte;
          
          if (byte === TelnetCommands.SB) {
            this.state.SUBNEG = true;
            this.state.subnegBuffer = [];
          } else if (byte === TelnetCommands.IAC) {
            // Escaped IAC, add a single IAC to output
            result.push(byte);
            this.resetState();
          }
          
          // Continue to next byte as this is part of a command
          continue;
        } 
        else if (this.state.SUBNEG) {
          // Handle subnegotiation
          if (this.state.SUBNEG_OPTION === null) {
            // This byte is the option code for subnegotiation
            this.state.SUBNEG_OPTION = byte;
            continue;
          }
          
          // Check for IAC + SE end of subnegotiation
          if (byte === TelnetCommands.IAC) {
            // Possible end of subnegotiation
            this.state.subnegBuffer.push(byte);
            continue;
          } 
          else if (this.state.subnegBuffer.length > 0 && 
                   this.state.subnegBuffer[this.state.subnegBuffer.length - 1] === TelnetCommands.IAC && 
                   byte === TelnetCommands.SE) {
            // End of subnegotiation
            // Remove the IAC from the buffer
            this.state.subnegBuffer.pop();
            
            // Process the subnegotiation
            this.handleSubnegotiation(this.state.SUBNEG_OPTION, this.state.subnegBuffer);
            
            // Reset state
            this.resetState();
            continue;
          } 
          else if (this.state.subnegBuffer.length > 0 && 
                   this.state.subnegBuffer[this.state.subnegBuffer.length - 1] === TelnetCommands.IAC) {
            // Escaped IAC within subnegotiation
            this.state.subnegBuffer.pop();
            this.state.subnegBuffer.push(TelnetCommands.IAC);
            this.state.subnegBuffer.push(byte);
            continue;
          } 
          else {
            // Regular byte in subnegotiation
            this.state.subnegBuffer.push(byte);
            continue;
          }
        } 
        else {
          // This byte is the option code for the command
          this.handleCommand(this.state.COMMAND, byte);
          this.resetState();
          continue;
        }
      }
      
      // Regular data byte or start of IAC sequence
      if (byte === TelnetCommands.IAC) {
        this.state.IAC = true;
        continue;
      }
      
      // Regular data byte
      result.push(byte);
    }
    
    return new Uint8Array(result);
  }
  
  /**
   * Reset the telnet state machine
   */
  resetState() {
    this.state.IAC = false;
    this.state.COMMAND = null;
    this.state.SUBNEG = false;
    this.state.SUBNEG_OPTION = null;
    this.state.subnegBuffer = [];
  }
  
  /**
   * Handle a telnet command
   * @param {number} command The command code (DO, DONT, WILL, WONT)
   * @param {number} option The option code
   */
  handleCommand(command, option) {
    // Check if this command was recently processed - skip if it was
    if (this.negotiationTracker.isRecentlyProcessed(command, option)) {
      this.debug(`Skipping duplicate command: ${this.getCommandName(command)} ${this.getOptionName(option)}`);
      return;
    }
    
    // Mark this command as processed
    this.negotiationTracker.markProcessed(command, option);
    
    this.debug(`Received ${this.getCommandName(command)} ${this.getOptionName(option)}`);
    
    switch (command) {
      case TelnetCommands.DO:
        this.handleDo(option);
        break;
      case TelnetCommands.DONT:
        this.handleDont(option);
        break;
      case TelnetCommands.WILL:
        this.handleWill(option);
        break;
      case TelnetCommands.WONT:
        this.handleWont(option);
        break;
      default:
        this.debug(`Unknown command: ${command}`);
    }
  }
  
  /**
   * Handle DO command (server requests client to enable an option)
   * @param {number} option The option code
   */
  handleDo(option) {
    switch (option) {
      case TelnetCommands.OPT_TERMINAL:
        // We'll agree to send terminal type
        this.options[option] = true;
        this.sendWill(option);
        break;
      case TelnetCommands.OPT_NAWS:
        // We'll agree to send window size
        this.options[option] = true;
        this.sendWill(option);
        // Send initial window size
        this.sendWindowSize();
        break;
      case TelnetCommands.OPT_SGA:
        // Suppress Go Ahead - we'll agree to this
        this.options[option] = true;
        this.sendWill(option);
        break;
      case TelnetCommands.OPT_ECHO:
        // Server wants to handle echo - this affects our UI
        // We'll agree, and turn off local echo in the terminal
        this.options[option] = true;
        this.sendWill(option);
        // Flag that server is handling echo
        if (typeof AppState !== 'undefined') {
          this.debug('Server will handle echo - disabling local echo');
          if (Elements.localEchoCheckbox) {
            Elements.localEchoCheckbox.checked = false;
          }
        }
        break;
      default:
        // Refuse any other options
        this.sendWont(option);
    }
  }
  
  /**
   * Handle DONT command (server requests client to disable an option)
   * @param {number} option The option code
   */
  handleDont(option) {
    // Always acknowledge by responding with WONT
    this.options[option] = false;
    this.sendWont(option);
    
    // Special handling for ECHO
    if (option === TelnetCommands.OPT_ECHO) {
      // In theory, server says "don't expect me to echo," but 
      // we've observed that some servers still echo anyway.
      // Keep local echo OFF to avoid doubling
      this.debug('Server sent DONT ECHO but may still be echoing - keeping local echo disabled');
      if (typeof AppState !== 'undefined') {
        if (Elements.localEchoCheckbox) {
          Elements.localEchoCheckbox.checked = false;
          
          // Dispatch change event to trigger any listeners
          const event = new Event('change');
          Elements.localEchoCheckbox.dispatchEvent(event);
        }
      }
    }
  }

  /**
   * Handle WILL command (server agrees to enable an option)
   * @param {number} option The option code
   */
  handleWill(option) {
    switch (option) {
      case TelnetCommands.OPT_ECHO:
        // Server will echo - we should disable local echo
        this.options[option] = true;
        this.sendDo(option);
        // Set terminal to not echo locally
        if (typeof AppState !== 'undefined') {
          this.debug('Server will handle echo - disabling local echo');
          if (Elements.localEchoCheckbox) {
            Elements.localEchoCheckbox.checked = false;
          }
        }
        break;
      case TelnetCommands.OPT_SGA:
        // Suppress Go Ahead - agree to this
        this.options[option] = true;
        this.sendDo(option);
        break;
      case TelnetCommands.OPT_LINEMODE:
        // Server wants to use line mode
        this.options[option] = true;
        this.sendDo(option);
        // Set terminal to line mode
        if (typeof AppState !== 'undefined') {
          this.debug('Server wants line mode - enabling line mode');
          if (typeof setTerminalMode === 'function') {
            setTerminalMode('line');
          }
          if (Elements.terminalModeSelector) {
            Elements.terminalModeSelector.value = 'line';
          }
        }
        break;
      default:
        // Agree for now, but we can change based on capabilities
        this.sendDo(option);
    }
  }
  
  /**
   * Handle WONT command (server refuses to enable an option)
   * @param {number} option The option code
   */
  handleWont(option) {
    // Always acknowledge by responding with DONT
    this.options[option] = false;
    this.sendDont(option);
    
    // Special handling for echo
    if (option === TelnetCommands.OPT_ECHO) {
      // Server won't echo, we should enable local echo
      if (typeof AppState !== 'undefined') {
        this.debug('Server will not handle echo - enabling local echo');
        if (Elements.localEchoCheckbox) {
          Elements.localEchoCheckbox.checked = true;
        }
      }
    }
  }
  
  /**
   * Handle subnegotiation
   * @param {number} option The option code
   * @param {Array<number>} buffer The subnegotiation data
   */
  handleSubnegotiation(option, buffer) {
    this.debug(`Subnegotiation for ${this.getOptionName(option)}`, buffer);
    
    switch (option) {
      case TelnetCommands.OPT_TERMINAL:
        // Terminal type negotiation
        if (buffer.length > 0 && buffer[0] === TelnetCommands.TERMINAL_SEND) {
          this.sendTerminalType();
        }
        break;
      default:
        this.debug(`Unhandled subnegotiation for option ${option}`);
    }
  }
  
  /**
   * Send WILL command with deduplication
   * @param {number} option The option code
   */
  sendWill(option) {
    // Check for duplicate command
    if (this.negotiationTracker.isRecentlyProcessed(TelnetCommands.WILL, option)) {
      this.debug(`Skipping duplicate outgoing WILL ${this.getOptionName(option)}`);
      return;
    }
    
    this.debug(`Sending WILL ${this.getOptionName(option)}`);
    const data = new Uint8Array([
      TelnetCommands.IAC,
      TelnetCommands.WILL,
      option
    ]);
    this.sendData(data);
    
    // Mark as processed
    this.negotiationTracker.markProcessed(TelnetCommands.WILL, option);
  }
  
  /**
   * Send WONT command with deduplication
   * @param {number} option The option code
   */
  sendWont(option) {
    // Check for duplicate command
    if (this.negotiationTracker.isRecentlyProcessed(TelnetCommands.WONT, option)) {
      this.debug(`Skipping duplicate outgoing WONT ${this.getOptionName(option)}`);
      return;
    }
    
    this.debug(`Sending WONT ${this.getOptionName(option)}`);
    const data = new Uint8Array([
      TelnetCommands.IAC,
      TelnetCommands.WONT,
      option
    ]);
    this.sendData(data);
    
    // Mark as processed
    this.negotiationTracker.markProcessed(TelnetCommands.WONT, option);
  }
  
  /**
   * Send DO command with deduplication
   * @param {number} option The option code
   */
  sendDo(option) {
    // Check for duplicate command
    if (this.negotiationTracker.isRecentlyProcessed(TelnetCommands.DO, option)) {
      this.debug(`Skipping duplicate outgoing DO ${this.getOptionName(option)}`);
      return;
    }
    
    this.debug(`Sending DO ${this.getOptionName(option)}`);
    const data = new Uint8Array([
      TelnetCommands.IAC,
      TelnetCommands.DO,
      option
    ]);
    this.sendData(data);
    
    // Mark as processed
    this.negotiationTracker.markProcessed(TelnetCommands.DO, option);
  }
  
  /**
   * Send DONT command with deduplication
   * @param {number} option The option code
   */
  sendDont(option) {
    // Check for duplicate command
    if (this.negotiationTracker.isRecentlyProcessed(TelnetCommands.DONT, option)) {
      this.debug(`Skipping duplicate outgoing DONT ${this.getOptionName(option)}`);
      return;
    }
    
    this.debug(`Sending DONT ${this.getOptionName(option)}`);
    const data = new Uint8Array([
      TelnetCommands.IAC,
      TelnetCommands.DONT,
      option
    ]);
    this.sendData(data);
    
    // Mark as processed
    this.negotiationTracker.markProcessed(TelnetCommands.DONT, option);
  }
  
  /**
   * Send terminal type subnegotiation
   */
  sendTerminalType() {
    this.debug(`Sending terminal type: ${this.terminalType}`);
    
    // Convert terminal type to byte array
    const terminalBytes = new TextEncoder().encode(this.terminalType);
    
    // Create buffer for the complete message
    const data = new Uint8Array(6 + terminalBytes.length);
    
    // IAC SB TERMINAL-TYPE IS ...terminal-type... IAC SE
    data[0] = TelnetCommands.IAC;
    data[1] = TelnetCommands.SB;
    data[2] = TelnetCommands.OPT_TERMINAL;
    data[3] = TelnetCommands.TERMINAL_IS;
    
    // Copy terminal type bytes
    for (let i = 0; i < terminalBytes.length; i++) {
      data[4 + i] = terminalBytes[i];
    }
    
    // End with IAC SE
    data[4 + terminalBytes.length] = TelnetCommands.IAC;
    data[5 + terminalBytes.length] = TelnetCommands.SE;
    
    this.sendData(data);
  }
  
  /**
   * Send window size subnegotiation
   */
  sendWindowSize() {
    this.debug(`Sending window size: ${this.terminalWidth}x${this.terminalHeight}`);
    
    // Create the NAWS message
    // IAC SB NAWS width-byte1 width-byte2 height-byte1 height-byte2 IAC SE
    const data = new Uint8Array([
      TelnetCommands.IAC,
      TelnetCommands.SB,
      TelnetCommands.OPT_NAWS,
      (this.terminalWidth >> 8) & 0xFF,   // Width high byte
      this.terminalWidth & 0xFF,          // Width low byte
      (this.terminalHeight >> 8) & 0xFF,  // Height high byte
      this.terminalHeight & 0xFF,         // Height low byte
      TelnetCommands.IAC,
      TelnetCommands.SE
    ]);
    
    this.sendData(data);
  }
  
  /**
   * Send raw data to the server
   * @param {Uint8Array} data The data to send
   */
  sendData(data) {
    if (this.sendCallback) {
      this.sendCallback(data);
    }
  }
  
  /**
   * Initialize telnet negotiation by sending initial options
   */
  initializeNegotiation() {
    // Only initialize once
    if (this.isInitialized) {
      this.debug('Telnet already initialized, skipping repeated initialization');
      return;
    }
    
    this.debug('Initializing telnet negotiation');
    console.log('Starting telnet negotiation with server');
    
    // Reset the negotiation tracker
    this.negotiationTracker.reset();
    
    // Tell server we WILL do these options if requested
    this.sendWill(TelnetCommands.OPT_TERMINAL);
    this.sendWill(TelnetCommands.OPT_NAWS);
    this.sendWill(TelnetCommands.OPT_SGA);
    
    // Ask server to DO these options
    this.sendDo(TelnetCommands.OPT_SGA);
    
    // For more complete negotiation, also indicate support for:
    this.sendWill(TelnetCommands.OPT_ECHO);  // We can echo locally if needed
    
    // Send initial terminal type and window size
    setTimeout(() => {
      if (this.options[TelnetCommands.OPT_TERMINAL]) {
        this.sendTerminalType();
      }
      
      if (this.options[TelnetCommands.OPT_NAWS]) {
        this.sendWindowSize();
      }
    }, 250); // Small delay to space out the negotiations
    
    console.log('Completed initial telnet negotiation sequence');
    this.isInitialized = true;
  }
  
  /**
   * Reset handler state for a new connection
   */
  reset() {
    // Reset option state
    Object.keys(this.options).forEach(key => {
      this.options[key] = false;
    });
    
    // Reset state machine
    this.resetState();
    
    // Reset negotiation tracker
    this.negotiationTracker.reset();
    
    // Reset initialization flag
    this.isInitialized = false;
  }
}

// Export for use in other files
window.TelnetHandler = TelnetHandler;
window.TelnetCommands = TelnetCommands;
window.OptionNames = OptionNames;
window.CommandNames = CommandNames;