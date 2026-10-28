// Intellect Browser Extension - Popup Script

class IntellectPopup {
  constructor() {
    this.currentTab = null;
    this.selectedText = '';
    this.tags = new Set();
    this.init();
  }

  async init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;

    // Check for selected text
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' });
      if (response && response.text) {
        this.selectedText = response.text;
        this.showSelectionInfo();
      }
    } catch (e) {
      // Content script not loaded yet
    }

    // Load page info
    this.loadPageInfo(tab);

    // Check auth state
    await this.checkAuth();

    // Bind events
    this.bindEvents();
  }

  async checkAuth() {
    const result = await chrome.storage.sync.get(['accessToken', 'user']);
    
    if (result.accessToken && result.user) {
      this.showSaveState(result.user);
    } else {
      this.showLoginState();
    }
  }

  showLoginState() {
    document.getElementById('login-state').classList.remove('hidden');
    document.getElementById('save-state').classList.add('hidden');
    document.getElementById('success-state').classList.add('hidden');
  }

  showSaveState(user) {
    document.getElementById('login-state').classList.add('hidden');
    document.getElementById('save-state').classList.remove('hidden');
    document.getElementById('success-state').classList.add('hidden');
  }

  showSuccessState() {
    document.getElementById('login-state').classList.add('hidden');
    document.getElementById('save-state').classList.add('hidden');
    document.getElementById('success-state').classList.remove('hidden');
  }

  showSelectionInfo() {
    const el = document.getElementById('selection-info');
    el.classList.remove('hidden');
  }

  loadPageInfo(tab) {
    document.getElementById('page-title').textContent = tab.title || 'Untitled';
    document.getElementById('page-url').textContent = tab.url || '';
    
    // Try to get favicon
    const favicon = document.getElementById('favicon');
    if (tab.favIconUrl) {
      favicon.innerHTML = `<img src="${tab.favIconUrl}" class="w-8 h-8 rounded" alt="">`;
    }
  }

  bindEvents() {
    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://intellect.app/login?extension=true' });
      window.close();
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => this.saveContent());

    // Add tag
    document.getElementById('add-tag').addEventListener('click', () => this.addTag());
    document.getElementById('tags-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTag();
    });

    // Open in app
    document.getElementById('open-app').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://intellect.app' });
      window.close();
    });
  }

  addTag() {
    const input = document.getElementById('tags-input');
    const tag = input.value.trim();
    
    if (tag && !this.tags.has(tag)) {
      this.tags.add(tag);
      this.renderTags();
      input.value = '';
    }
  }

  removeTag(tag) {
    this.tags.delete(tag);
    this.renderTags();
  }

  renderTags() {
    const container = document.getElementById('tags-list');
    container.innerHTML = '';
    
    this.tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1';
      el.innerHTML = `${tag} <button class="hover:text-blue-900 dark:hover:text-blue-100">×</button>`;
      el.querySelector('button').addEventListener('click', () => this.removeTag(tag));
      container.appendChild(el);
    });
  }

  async saveContent() {
    const saveBtn = document.getElementById('save-btn');
    const status = document.getElementById('status');
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <span>Saving...</span>
    `;

    try {
      // Get auth token
      const result = await chrome.storage.sync.get(['accessToken']);
      if (!result.accessToken) {
        throw new Error('Not authenticated');
      }

      // Prepare content data
      const contentData = {
        title: this.currentTab.title,
        url: this.currentTab.url,
        sourceType: this.detectSourceType(this.currentTab.url),
        rawContent: this.selectedText || undefined,
        metadata: {
          description: '',
          favicon: this.currentTab.favIconUrl,
        },
      };

      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'saveContent',
        contentData,
        options: {
          autoSummarize: document.getElementById('auto-summarize').checked,
          autoTag: document.getElementById('auto-tag').checked,
          tags: Array.from(this.tags),
        },
      });

      if (response.success) {
        this.showSuccessState();
        this.showStatus('Content saved successfully!', 'success');
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Save failed:', error);
      this.showStatus(error.message || 'Failed to save content', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
        </svg>
        <span>Save to Intellect</span>
      `;
    }
  }

  detectSourceType(url) {
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

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `mt-3 p-3 rounded-lg text-sm ${
      type === 'success' 
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    }`;
    status.classList.remove('hidden');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new IntellectPopup();
});