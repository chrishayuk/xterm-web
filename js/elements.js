// elements.js - DOM element references

// Form elements
const Elements = {
    hostInput: document.getElementById('host'),
    portInput: document.getElementById('port'),
    proxyPortInput: document.getElementById('proxyPort'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    connectionForm: document.getElementById('connectionForm'),
    statusDisplay: document.getElementById('status'),
    targetDisplay: document.getElementById('targetDisplay'),
    commandInput: document.getElementById('commandInput'),
    sendBtn: document.getElementById('sendBtn'),
    commandInputContainer: document.getElementById('commandInputContainer'),
    terminalElement: document.getElementById('terminal'),
    clickIndicator: document.getElementById('clickIndicator')
  };
  
  // Create local echo checkbox
  function createEchoToggle() {
    const localEchoCheckbox = document.createElement('input');
    localEchoCheckbox.type = 'checkbox';
    localEchoCheckbox.id = 'localEchoToggle';
    localEchoCheckbox.checked = true;
    
    const localEchoLabel = document.createElement('label');
    localEchoLabel.htmlFor = 'localEchoToggle';
    localEchoLabel.textContent = 'Local Echo';
    localEchoLabel.className = 'echo-label';
    
    const echoContainer = document.createElement('div');
    echoContainer.className = 'echo-container';
    echoContainer.appendChild(localEchoCheckbox);
    echoContainer.appendChild(localEchoLabel);
    
    // Add the echo toggle after the terminal is created
    Elements.terminalElement.parentNode.insertBefore(echoContainer, Elements.terminalElement.nextSibling);
    
    // Add to Elements
    Elements.localEchoCheckbox = localEchoCheckbox;
    Elements.echoContainer = echoContainer;
  }