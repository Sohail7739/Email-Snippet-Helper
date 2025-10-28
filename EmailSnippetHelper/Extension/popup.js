document.addEventListener('DOMContentLoaded', async () => {
  const snippetsDiv = document.getElementById('snippets');
  const addButton = document.getElementById('addSnippet');
  const newSnippet = document.getElementById('newSnippet');
  const clearBtn = document.getElementById('clearBtn');
  const syncBtn = document.getElementById('syncBtn');
  const statusDiv = document.getElementById('status');

  // Disable all cloud sync to avoid any CORS/network errors in console
  const ENABLE_CLOUD_SYNC = false;
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.title = 'Cloud sync disabled';
    syncBtn.style.display = 'none';
  }
  
  // Load saved snippets
  await loadSnippets();

  function showStatus(message, isError = false) {
    statusDiv.innerHTML = `<div class="status-message ${isError ? 'status-error' : 'status-success'}">${message}</div>`;
    setTimeout(() => {
      statusDiv.innerHTML = '';
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
      snippetsDiv.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-inbox"></i>
          <h6>No snippets yet</h6>
          <p>Create your first email template below</p>
        </div>
      `;
      return;
    }

    snippetsDiv.innerHTML = snippets.map((snippet, i) => `
      <div class="snippet-item insert-snippet" data-index="${i}">
        <div class="snippet-text">${snippet}</div>
        <div class="snippet-actions">
          <button class="action-btn insert-btn" data-index="${i}" title="Insert into email">
            <i class="bi bi-cursor"></i> Insert
          </button>
          <button class="action-btn delete-btn" data-index="${i}" title="Delete snippet">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  // Add snippet - FIXED: No auto-paste, just saves
  addButton.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation(); // Stop event bubbling
    
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
      newSnippet.value = ''; // Clear input
      displaySnippets(snippets);
      showStatus('✅ Snippet saved successfully!');
    } catch (error) {
      console.error('Error saving snippet:', error);
      showStatus('❌ Error saving snippet', true);
    }
  });

  // Clear all snippets
  clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear ALL snippets?')) {
      try {
        await chrome.storage.sync.set({ snippets: [] });
        displaySnippets([]);
        showStatus('🗑️ All snippets cleared!');
      } catch (error) {
        console.error('Error clearing snippets:', error);
        showStatus('❌ Error clearing snippets', true);
      }
    }
  });

  // Handle snippet clicks - Insert or Delete
  snippetsDiv.addEventListener('click', async (e) => {
    const target = e.target;
    const index = target.dataset.index;

    // Insert snippet into email
    if (target.classList.contains('insert-btn') || target.classList.contains('insert-snippet')) {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        const data = await chrome.storage.sync.get(['snippets']);
        const snippet = data.snippets[index];
        
        if (snippet) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: insertTextIntoEmail,
            args: [snippet]
          });
          
          showStatus('✅ Snippet inserted successfully!');
          setTimeout(() => window.close(), 1500); // Close popup after insertion
        }
      } catch (error) {
        console.error('Error inserting snippet:', error);
        showStatus('❌ Error inserting snippet', true);
      }
    }
    
    // Delete snippet
    else if (target.classList.contains('delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      if (confirm('Are you sure you want to delete this snippet?')) {
        try {
          const data = await chrome.storage.sync.get(['snippets']);
          const snippets = data.snippets || [];
          snippets.splice(index, 1);
          await chrome.storage.sync.set({ snippets });
          displaySnippets(snippets);
          showStatus('🗑️ Snippet deleted successfully!');
        } catch (error) {
          console.error('Error deleting snippet:', error);
          showStatus('❌ Error deleting snippet', true);
        }
      }
    }
  });

  // Auto-sync disabled completely to guarantee zero console errors
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
