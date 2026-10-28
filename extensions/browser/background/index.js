// Intellect Browser Extension - Background Service Worker

const API_BASE = 'https://api.intellect.app';
const AUTH_URL = 'https://intellect.app';

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open welcome page
    chrome.tabs.create({ url: 'https://intellect.app/welcome?extension=true' });
  }
  
  // Create context menus
  createContextMenus();
});

// Create context menus
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-page',
      title: 'Save page to Intellect',
      contexts: ['page'],
    });
    
    chrome.contextMenus.create({
      id: 'save-selection',
      title: 'Save selection to Intellect',
      contexts: ['selection'],
    });
    
    chrome.contextMenus.create({
      id: 'save-link',
      title: 'Save link to Intellect',
      contexts: ['link'],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const result = await chrome.storage.sync.get(['accessToken']);
    if (!result.accessToken) {
      showNotification('Please sign in to Intellect first');
      chrome.tabs.create({ url: `${AUTH_URL}/login?extension=true` });
      return;
    }

    let contentData = {
      title: tab.title,
      url: info.pageUrl || tab.url,
      sourceType: detectSourceType(info.pageUrl || tab.url),
      metadata: {
        favicon: tab.favIconUrl,
      },
    };

    let options = {
      autoSummarize: true,
      autoTag: true,
    };

    if (info.menuItemId === 'save-selection' && info.selectionText) {
      contentData.rawContent = info.selectionText;
      contentData.metadata.description = 'Saved from selection';
    } else if (info.menuItemId === 'save-link' && info.linkUrl) {
      contentData.url = info.linkUrl;
      contentData.title = info.linkText || 'Link';
      contentData.metadata.description = 'Saved from link';
    }

    const response = await saveContentToAPI(result.accessToken, contentData, options);
    
    if (response.success) {
      showNotification('Saved to Intellect!');
    } else {
      showNotification('Failed to save: ' + (response.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Context menu error:', error);
    showNotification('Failed to save content');
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'saveContent':
      handleSaveContent(message, sender, sendResponse);
      return true; // Async response
    
    case 'getSelection':
      handleGetSelection(message, sender, sendResponse);
      return true;
    
    case 'checkAuth':
      handleCheckAuth(sendResponse);
      return true;
    
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle save content from popup
async function handleSaveContent(message, sender, sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['accessToken']);
    if (!result.accessToken) {
      sendResponse({ success: false, error: 'Not authenticated' });
      return;
    }

    const response = await saveContentToAPI(
      result.accessToken,
      message.contentData,
      message.options
    );
    
    sendResponse(response);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get selection from content script
async function handleGetSelection(message, sender, sendResponse) {
  try {
    // Inject content script if needed
    await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: getSelectionText,
    });
    
    // The result will be sent back via message
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle check auth
async function handleCheckAuth(sendResponse) {
  const result = await chrome.storage.sync.get(['accessToken', 'user']);
  sendResponse({ 
    authenticated: !!result.accessToken, 
    user: result.user 
  });
}

// Save content to API
async function saveContentToAPI(accessToken, contentData, options) {
  try {
    const response = await fetch(`${API_BASE}/api/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ...contentData, options }),
    });

    if (response.status === 401) {
      // Token expired, try refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        return saveContentToAPI(refreshed, contentData, options);
      }
      await chrome.storage.sync.remove(['accessToken', 'user']);
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Refresh access token
async function refreshToken() {
  try {
    const result = await chrome.storage.sync.get(['refreshToken']);
    if (!result.refreshToken) return null;

    const response = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: result.refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    await chrome.storage.sync.set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    
    return data.accessToken;
  } catch {
    return null;
  }
}

// Detect source type from URL
function detectSourceType(url) {
  if (!url) return 'generic';
  const hostname = new URL(url).hostname.replace('www.', '');
  
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  if (hostname.includes('spotify.com') || hostname.includes('podcast')) return 'podcast';
  if (hostname.includes('wikipedia.org')) return 'wikipedia';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('reddit.com')) return 'reddit';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  return 'article';
}

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: 'Intellect',
    message,
  });
}

// Handle commands (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (command === 'save-page') {
    // Trigger save page
    const result = await chrome.storage.sync.get(['accessToken']);
    if (result.accessToken) {
      const contentData = {
        title: tab.title,
        url: tab.url,
        sourceType: detectSourceType(tab.url),
        metadata: { favicon: tab.favIconUrl },
      };
      await saveContentToAPI(result.accessToken, contentData, { autoSummarize: true, autoTag: true });
      showNotification('Page saved to Intellect!');
    } else {
      showNotification('Please sign in to Intellect first');
    }
  } else if (command === 'save-selection') {
    // Get selection and save
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getSelectionText,
      });
      
      if (result.result) {
        const authResult = await chrome.storage.sync.get(['accessToken']);
        if (authResult.accessToken) {
          const contentData = {
            title: tab.title,
            url: tab.url,
            sourceType: detectSourceType(tab.url),
            rawContent: result.result,
            metadata: { favicon: tab.favIconUrl, description: 'Saved from selection' },
          };
          await saveContentToAPI(authResult.accessToken, contentData, { autoSummarize: true, autoTag: true });
          showNotification('Selection saved to Intellect!');
        } else {
          showNotification('Please sign in to Intellect first');
        }
      }
    } catch (error) {
      showNotification('Failed to save selection');
    }
  }
});

// Get selection text (injected into page)
function getSelectionText() {
  return window.getSelection().toString().trim();
}

// Listen for messages from content script with selection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'selectionChanged') {
    // Store selection for quick access
    chrome.storage.session.set({ lastSelection: message.text });
  }
});

// Handle tab updates to refresh context menus
chrome.tabs.onActivated.addListener(() => {
  // Context menus are global, no need to refresh
});