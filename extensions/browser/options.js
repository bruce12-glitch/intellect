// Intellect Browser Extension - Options Page Script

class IntellectOptions {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadState();
    this.bindEvents();
    this.updateVersion();
  }

  async loadState() {
    const result = await chrome.storage.sync.get(['accessToken', 'user', 'preferences']);
    
    if (result.accessToken && result.user) {
      this.showLoggedIn(result.user, result.preferences);
    } else {
      this.showLoggedOut();
    }
  }

  showLoggedIn(user, preferences) {
    document.getElementById('logged-out').classList.add('hidden');
    document.getElementById('logged-in').classList.remove('hidden');
    document.getElementById('preferences-section').innerHTML = this.renderPreferences(preferences || {});
    
    document.getElementById('user-name').textContent = user.name || 'User';
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').textContent = (user.name || 'U')[0].toUpperCase();
    document.getElementById('user-tier').textContent = `${user.subscriptionTier || 'Free'} Plan`;
  }

  showLoggedOut() {
    document.getElementById('logged-out').classList.remove('hidden');
    document.getElementById('logged-in').classList.add('hidden');
    document.getElementById('preferences-section').innerHTML = `
      <p class="text-gray-500 dark:text-gray-400 text-sm">Sign in to manage your preferences.</p>
    `;
  }

  renderPreferences(prefs) {
    const defaultPrefs = {
      autoSummarize: true,
      autoTag: true,
      language: 'en',
      theme: 'system',
      emailNotifications: true,
      quizReminders: true,
      spacedRepetitionEnabled: true,
      defaultAIModel: 'gpt-4o-mini',
      defaultAIProvider: 'openai',
    };

    const p = { ...defaultPrefs, ...prefs };

    return `
      <div class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="pref-auto-summarize" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${p.autoSummarize ? 'checked' : ''}>
            <span class="text-sm text-gray-700 dark:text-gray-300">Auto-generate summaries</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="pref-auto-tag" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${p.autoTag ? 'checked' : ''}>
            <span class="text-sm text-gray-700 dark:text-gray-300">Auto-tag content</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="pref-email-notifications" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${p.emailNotifications ? 'checked' : ''}>
            <span class="text-sm text-gray-700 dark:text-gray-300">Email notifications</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="pref-quiz-reminders" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${p.quizReminders ? 'checked' : ''}>
            <span class="text-sm text-gray-700 dark:text-gray-300">Quiz reminders</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="pref-spaced-repetition" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" ${p.spacedRepetitionEnabled ? 'checked' : ''}>
            <span class="text-sm text-gray-700 dark:text-gray-300">Spaced repetition</span>
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default AI Model</label>
            <select id="pref-ai-model" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="gpt-4o-mini" ${p.defaultAIModel === 'gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini</option>
              <option value="gpt-4o" ${p.defaultAIModel === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
              <option value="gpt-4-turbo" ${p.defaultAIModel === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
              <option value="claude-3-5-sonnet" ${p.defaultAIModel === 'claude-3-5-sonnet' ? 'selected' : ''}>Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku" ${p.defaultAIModel === 'claude-3-haiku' ? 'selected' : ''}>Claude 3 Haiku</option>
              <option value="gemini-1.5-flash" ${p.defaultAIModel === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro" ${p.defaultAIModel === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default AI Provider</label>
            <select id="pref-ai-provider" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="openai" ${p.defaultAIProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="anthropic" ${p.defaultAIProvider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
              <option value="google" ${p.defaultAIProvider === 'google' ? 'selected' : ''}>Google</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
            <select id="pref-language" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="en" ${p.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${p.language === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${p.language === 'fr' ? 'selected' : ''}>French</option>
              <option value="de" ${p.language === 'de' ? 'selected' : ''}>German</option>
              <option value="zh" ${p.language === 'zh' ? 'selected' : ''}>Chinese</option>
              <option value="ja" ${p.language === 'ja' ? 'selected' : ''}>Japanese</option>
              <option value="ko" ${p.language === 'ko' ? 'selected' : ''}>Korean</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
            <select id="pref-theme" class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="system" ${p.theme === 'system' ? 'selected' : ''}>System</option>
              <option value="light" ${p.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${p.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button id="save-prefs" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Save Preferences
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Sign in
    document.getElementById('signin-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://intellect.app/login?extension=true' });
    });

    // Sign out
    document.getElementById('signout-btn').addEventListener('click', async () => {
      await chrome.storage.sync.remove(['accessToken', 'refreshToken', 'user', 'preferences']);
      this.showLoggedOut();
    });

    // Save preferences
    document.addEventListener('click', (e) => {
      if (e.target.id === 'save-prefs') {
        this.savePreferences();
      }
    });
  }

  async savePreferences() {
    const btn = document.getElementById('save-prefs');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const preferences = {
      autoSummarize: document.getElementById('pref-auto-summarize').checked,
      autoTag: document.getElementById('pref-auto-tag').checked,
      emailNotifications: document.getElementById('pref-email-notifications').checked,
      quizReminders: document.getElementById('pref-quiz-reminders').checked,
      spacedRepetitionEnabled: document.getElementById('pref-spaced-repetition').checked,
      defaultAIModel: document.getElementById('pref-ai-model').value,
      defaultAIProvider: document.getElementById('pref-ai-provider').value,
      language: document.getElementById('pref-language').value,
      theme: document.getElementById('pref-theme').value,
    };

    try {
      // Save locally
      await chrome.storage.sync.set({ preferences });

      // Sync with server if authenticated
      const result = await chrome.storage.sync.get(['accessToken']);
      if (result.accessToken) {
        await fetch('https://api.intellect.app/api/user/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.accessToken}`,
          },
          body: JSON.stringify({ preferences }),
        });
      }

      this.showNotification('Preferences saved!');
    } catch (error) {
      this.showNotification('Failed to save preferences', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  updateVersion() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById('version').textContent = manifest.version;
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `intellect-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'intellect-slide-in 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new IntellectOptions();
});