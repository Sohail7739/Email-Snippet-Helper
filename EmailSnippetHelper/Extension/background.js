// Background service worker for Email Snippet Helper
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Email Snippet Helper installed!");
  
  // Initialize default snippets if none exist
  chrome.storage.sync.get(['snippets'], (data) => {
    if (!data.snippets || data.snippets.length === 0) {
      const defaultSnippets = [
        "Hello, hope you're doing well!",
        "Thank you for reaching out.",
        "Best regards,",
        "Looking forward to hearing from you.",
        "Please let me know if you have any questions."
      ];
      chrome.storage.sync.set({ snippets: defaultSnippets });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insertSnippet") {
    console.log("Received snippet insertion request:", request.snippet);
    sendResponse({ success: true });
  }
});
