// Content script for Email Snippet Helper
console.log("Email Snippet Helper content script loaded");

// Detect if we're on Gmail or Outlook
const isGmail = window.location.hostname === 'mail.google.com';
const isOutlook = window.location.hostname === 'outlook.office.com';

// Enhanced text insertion function for different email platforms
function insertTextIntoEmail(text) {
  let inserted = false;
  
  if (isGmail) {
    inserted = insertIntoGmail(text);
  } else if (isOutlook) {
    inserted = insertIntoOutlook(text);
  } else {
    // Generic insertion for other email platforms
    inserted = insertGeneric(text);
  }
  
  if (!inserted) {
    console.log("Could not find email compose area");
    // Show a subtle notification
    showNotification("Click inside an email compose box first!");
  }
  
  return inserted;
}

function insertIntoGmail(text) {
  // Gmail uses contentEditable divs
  const composeArea = document.querySelector('[contenteditable="true"][aria-label*="Message Body"], [contenteditable="true"][aria-label*="Compose"]');
  
  if (composeArea) {
    composeArea.focus();
    
    // Try modern approach first
    if (document.execCommand) {
      document.execCommand('insertText', false, text);
    } else {
      // Fallback for newer browsers
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Trigger input event for Gmail's React components
    composeArea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  
  return false;
}

function insertIntoOutlook(text) {
  // Outlook Web uses different selectors
  const composeArea = document.querySelector('[contenteditable="true"][aria-label*="Message body"], [contenteditable="true"][role="textbox"]');
  
  if (composeArea) {
    composeArea.focus();
    
    if (document.execCommand) {
      document.execCommand('insertText', false, text);
    } else {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    composeArea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  
  return false;
}

function insertGeneric(text) {
  // Generic insertion for other email platforms
  const activeElement = document.activeElement;
  
  if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.contentEditable === 'true')) {
    if (activeElement.contentEditable === 'true') {
      if (document.execCommand) {
        document.execCommand('insertText', false, text);
      } else {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, start) + text + activeElement.value.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }
  
  return false;
}

function showNotification(message) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insertSnippet") {
    const success = insertTextIntoEmail(request.snippet);
    sendResponse({ success: success });
  }
});

// Add keyboard shortcut support (Ctrl+Shift+S to open extension)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: "openPopup" });
  }
});

console.log(`Email Snippet Helper loaded for ${isGmail ? 'Gmail' : isOutlook ? 'Outlook' : 'generic email platform'}`);
