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

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically due to manifest configuration
  console.log("Extension icon clicked on tab:", tab.url);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "insertSnippet") {
    // Handle snippet insertion requests
    console.log("Received snippet insertion request:", request.snippet);
    sendResponse({ success: true });
  }
});

// Periodic sync with API (every 30 minutes)
chrome.alarms.create('syncSnippets', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncSnippets') {
    syncWithAPI();
  }
});

async function syncWithAPI() {
  try {
    const API_URL = "https://email-snippet-api.onrender.com/api/snippets";
    const response = await fetch(API_URL);
    
    if (response.ok) {
      const cloudSnippets = await response.json();
      const data = await chrome.storage.sync.get(['snippets']);
      const localSnippets = data.snippets || [];
      
      // Merge and deduplicate snippets
      const mergedSnippets = [...new Set([...cloudSnippets, ...localSnippets])];
      await chrome.storage.sync.set({ snippets: mergedSnippets });
      
      console.log("Background sync completed successfully");
    }
  } catch (error) {
    console.log("Background sync failed:", error);
  }
}
