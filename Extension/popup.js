document.addEventListener('DOMContentLoaded', async () => {
  const snippetsDiv = document.getElementById('snippets');
  const addButton = document.getElementById('addSnippet');
  const newSnippet = document.getElementById('newSnippet');
  const clearBtn = document.getElementById('clearBtn');
  const syncBtn = document.getElementById('syncBtn');
  const statusDiv = document.getElementById('status');

  // API Configuration
  const API_URL = "https://email-snippet-api.onrender.com/api/snippets";
  
  // Load saved snippets
  await loadSnippets();

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `mt-2 text-center small ${isError ? 'text-danger' : 'text-success'}`;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'mt-2 text-center text-muted small';
    }, 3000);
  }

  async function loadSnippets() {
    try {
      const data = await chrome.storage.sync.get(['snippets']);
      const snippets = data.snippets || [];
      displaySnippets(snippets);
    } catch (error) {
      console.error('Error loading snippets:', error);
      showStatus('Error loading snippets', true);
    }
  }

  function displaySnippets(snippets) {
    if (snippets.length === 0) {
      snippetsDiv.innerHTML = '<div class="text-muted text-center py-3">No snippets yet. Add your first snippet below!</div>';
      return;
    }

    snippetsDiv.innerHTML = snippets.map((snippet, i) => `
      <div class="snippet-item mb-2">
        <button class="btn btn-outline-secondary btn-sm w-100 snippet-btn insert-snippet" data-index="${i}">
          <span class="snippet-text">${snippet}</span>
        </button>
        <button class="btn btn-outline-danger btn-sm delete-btn delete-snippet" data-index="${i}" title="Delete snippet">
          ×
        </button>
      </div>
    `).join('');
  }

  // Add snippet
  addButton.addEventListener('click', async () => {
    const text = newSnippet.value.trim();
    if (!text) {
      showStatus('Please enter a snippet', true);
      return;
    }

    try {
      const data = await chrome.storage.sync.get(['snippets']);
      const snippets = data.snippets || [];
      snippets.push(text);
      await chrome.storage.sync.set({ snippets });
      newSnippet.value = '';
      displaySnippets(snippets);
      showStatus('Snippet saved!');
    } catch (error) {
      console.error('Error saving snippet:', error);
      showStatus('Error saving snippet', true);
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    newSnippet.value = '';
  });

  // Sync with API
  syncBtn.addEventListener('click', async () => {
    try {
      showStatus('Syncing...');
      const response = await fetch(API_URL);
      if (response.ok) {
        const cloudSnippets = await response.json();
        await chrome.storage.sync.set({ snippets: cloudSnippets });
        displaySnippets(cloudSnippets);
        showStatus('Synced with cloud!');
      } else {
        throw new Error('Failed to fetch from API');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showStatus('Sync failed - using local snippets', true);
    }
  });

  // Insert snippet into email
  snippetsDiv.addEventListener('click', async (e) => {
    if (e.target.classList.contains('insert-snippet')) {
      const index = e.target.dataset.index;
      try {
        const data = await chrome.storage.sync.get(['snippets']);
        const snippet = data.snippets[index];
        
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: insertTextIntoEmail,
          args: [snippet]
        });
        
        showStatus('Snippet inserted!');
        window.close(); // Close popup after insertion
      } catch (error) {
        console.error('Error inserting snippet:', error);
        showStatus('Error inserting snippet', true);
      }
    }
  });

  // Delete snippet
  snippetsDiv.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-snippet')) {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);
      
      if (confirm('Are you sure you want to delete this snippet?')) {
        try {
          const data = await chrome.storage.sync.get(['snippets']);
          const snippets = data.snippets || [];
          snippets.splice(index, 1);
          await chrome.storage.sync.set({ snippets });
          displaySnippets(snippets);
          showStatus('Snippet deleted');
        } catch (error) {
          console.error('Error deleting snippet:', error);
          showStatus('Error deleting snippet', true);
        }
      }
    }
  });

  // Auto-sync on startup (optional)
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const cloudSnippets = await response.json();
      const data = await chrome.storage.sync.get(['snippets']);
      const localSnippets = data.snippets || [];
      
      // Merge cloud and local snippets (avoid duplicates)
      const mergedSnippets = [...new Set([...cloudSnippets, ...localSnippets])];
      await chrome.storage.sync.set({ snippets: mergedSnippets });
      displaySnippets(mergedSnippets);
    }
  } catch (error) {
    console.log('Auto-sync failed, using local snippets');
  }
});

// Function to inject into active tab
function insertTextIntoEmail(text) {
  const active = document.activeElement;
  
  if (active && (active.tagName === 'TEXTAREA' || active.contentEditable === 'true')) {
    if (active.contentEditable === 'true') {
      // For contentEditable elements (like Gmail)
      document.execCommand('insertText', false, text);
    } else {
      // For textarea elements
      const start = active.selectionStart;
      const end = active.selectionEnd;
      active.value = active.value.substring(0, start) + text + active.value.substring(end);
      active.selectionStart = active.selectionEnd = start + text.length;
      
      // Trigger input event for React/Vue components
      active.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    // Try to find email compose areas
    const composeAreas = document.querySelectorAll('[contenteditable="true"], textarea[placeholder*="email"], textarea[placeholder*="message"]');
    if (composeAreas.length > 0) {
      const composeArea = composeAreas[0];
      composeArea.focus();
      
      if (composeArea.contentEditable === 'true') {
        document.execCommand('insertText', false, text);
      } else {
        composeArea.value += text;
        composeArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      alert("Please click inside an email compose box first!");
    }
  }
}
