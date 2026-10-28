// Intellect Browser Extension - Content Script

// State
let selectionOverlay = null;
let isOverlayVisible = false;

// Initialize
function init() {
  // Listen for selection changes
  document.addEventListener('selectionchange', handleSelectionChange);
  
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelection') {
      const selection = window.getSelection().toString().trim();
      sendResponse({ text: selection });
      return true;
    }
  });

  // Keyboard shortcut for saving selection
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      saveSelection();
    }
  });
}

function handleSelectionChange() {
  const selection = window.getSelection().toString().trim();
  
  if (selection.length > 10) {
    showSelectionOverlay(selection);
    chrome.runtime.sendMessage({ action: 'selectionChanged', text: selection });
  } else {
    hideSelectionOverlay();
  }
}

function showSelectionOverlay(text) {
  if (isOverlayVisible) return;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  // Create overlay
  selectionOverlay = document.createElement('div');
  selectionOverlay.id = 'intellect-selection-overlay';
  selectionOverlay.innerHTML = `
    <div class="intellect-tooltip">
      <button class="intellect-save-btn" title="Save to Intellect">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        <span>Save to Intellect</span>
      </button>
      <div class="intellect-preview">${escapeHtml(text.slice(0, 100))}${text.length > 100 ? '...' : ''}</div>
    </div>
  `;
  
  // Style
  const style = document.createElement('style');
  style.textContent = `
    #intellect-selection-overlay {
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
    }
    #intellect-selection-overlay .intellect-tooltip {
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      #intellect-selection-overlay .intellect-tooltip {
        background: #1f2937;
        border-color: #374151;
      }
    }
    #intellect-selection-overlay .intellect-save-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    #intellect-selection-overlay .intellect-save-btn:hover {
      background: #1d4ed8;
    }
    #intellect-selection-overlay .intellect-preview {
      font-size: 12px;
      color: #6b7280;
      max-width: 200px;
      line-height: 1.4;
    }
    @media (prefers-color-scheme: dark) {
      #intellect-selection-overlay .intellect-preview {
        color: #9ca3af;
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Position near selection
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  
  selectionOverlay.style.left = `${rect.left + scrollX}px`;
  selectionOverlay.style.top = `${rect.bottom + scrollY + 8}px`;
  
  document.body.appendChild(selectionOverlay);
  
  // Add click handler
  selectionOverlay.querySelector('.intellect-save-btn').addEventListener('click', () => {
    saveSelection(text);
  });
  
  isOverlayVisible = true;
  
  // Auto-hide after 10 seconds
  setTimeout(() => hideSelectionOverlay(), 10000);
}

function hideSelectionOverlay() {
  if (selectionOverlay) {
    selectionOverlay.remove();
    selectionOverlay = null;
    isOverlayVisible = false;
  }
}

function saveSelection(text) {
  const selection = text || window.getSelection().toString().trim();
  if (!selection) return;
  
  hideSelectionOverlay();
  
  // Send to background to save
  chrome.runtime.sendMessage({
    action: 'saveSelection',
    text: selection,
    url: window.location.href,
    title: document.title,
  });
  
  // Show brief confirmation
  showNotification('Saving to Intellect...');
}

function showNotification(message) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    padding: 12px 20px;
    background: #2563eb;
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}