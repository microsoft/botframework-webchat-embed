(function () {
  'use strict';

  /**
   * BotFramework WebChat Embed
   * https://github.com/microsoft/botframework-webchat-embed
   *
   * MIT License - No warranty, use at your own risk
   */

  (function () {

    const WEBCHAT_CDN = 'https://cdn.botframework.com/botframework-webchat/latest/webchat.js';
    const ATTR_PREFIX = 'data-webchat-';
    const STYLE_PREFIX = 'data-webchat-style-';

    // Default style options
    const DEFAULT_STYLES = {
      bubbleBorderRadius: 12,
      bubbleFromUserBorderRadius: 12
    };

    // SVG Icons
    const ICONS = {
      minimize: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
      restart: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',
      chat: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
    };

    // Inject styles once
    let stylesInjected = false;
    function injectStyles() {
      if (stylesInjected) return;
      stylesInjected = true;

      const css = `
      .webchat-embed-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #fff;
      }
      .webchat-embed-container.minimized {
        display: none;
      }
      .webchat-embed-header {
        padding: 12px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        font-weight: 600;
        background: var(--webchat-header-bg, #0078d4);
        color: var(--webchat-header-color, #ffffff);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .webchat-embed-header-title {
        flex: 1;
      }
      .webchat-embed-header-actions {
        display: flex;
        gap: 8px;
      }
      .webchat-embed-header-btn {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s, background 0.2s;
      }
      .webchat-embed-header-btn:hover {
        opacity: 1;
        background: rgba(255,255,255,0.15);
      }
      .webchat-embed-chat {
        flex: 1;
        min-height: 0;
      }
      .webchat-embed-bubble {
        position: absolute;
        bottom: 0;
        right: 0;
        width: auto;
        min-width: 60px;
        height: 60px;
        border-radius: 30px;
        background: var(--webchat-header-bg, #0078d4);
        color: var(--webchat-header-color, #ffffff);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .webchat-embed-bubble:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(0,0,0,0.3);
      }
      .webchat-embed-bubble.hidden {
        display: none;
      }
      .webchat-embed-bubble-icon-only {
        width: 60px;
        padding: 0;
      }
      .webchat-embed-minimized {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      .webchat-embed-minimized > .webchat-embed-container {
        display: none !important;
      }
      .webchat-embed-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
      }
      .webchat-embed-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e0e0e0;
        border-top-color: var(--webchat-header-bg, #0078d4);
        border-radius: 50%;
        animation: webchat-spin 0.8s linear infinite;
      }
      @keyframes webchat-spin {
        to { transform: rotate(360deg); }
      }
    `;

      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }

    /**
     * Convert kebab-case to camelCase
     */
    function kebabToCamel(str) {
      return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Detect a CSS variable from :root, checking multiple common names
     */
    function detectCSSVariable(...varNames) {
      const rootStyles = getComputedStyle(document.documentElement);
      for (const name of varNames) {
        const value = rootStyles.getPropertyValue(name).trim();
        if (value) return value;
      }
      return null;
    }

    /**
     * Parse style attributes from element into styleOptions object
     * Priority (lowest to highest):
     * 1. Auto-detected CSS variables and computed styles
     * 2. User-provided styleOptions object via data-webchat-style-options
     * 3. Individual data-webchat-style-* attributes
     */
    function parseStyleOptions(element) {
      const styleOptions = { ...DEFAULT_STYLES };

      // 1. Auto-detect from CSS variables
      const detectedAccent = detectCSSVariable(
        '--primary-color',
        '--accent-color',
        '--brand-color',
        '--color-primary',
        '--theme-primary'
      );
      if (detectedAccent) {
        styleOptions.accent = detectedAccent;
      }

      const detectedRadius = detectCSSVariable('--border-radius', '--radius');
      if (detectedRadius) {
        const parsed = parseInt(detectedRadius, 10);
        if (!isNaN(parsed)) {
          styleOptions.bubbleBorderRadius = parsed;
          styleOptions.bubbleFromUserBorderRadius = parsed;
        }
      }

      // Auto-detect font from container's computed style
      const computedFont = getComputedStyle(element).fontFamily;
      if (computedFont && computedFont !== 'none') {
        styleOptions.primaryFont = computedFont;
      }

      // 2. Merge user-provided styleOptions object (global variable reference)
      const styleOptionsRef = element.getAttribute(`${ATTR_PREFIX}style-options`);
      if (styleOptionsRef && window[styleOptionsRef]) {
        Object.assign(styleOptions, window[styleOptionsRef]);
      }

      // 3. Individual data-webchat-style-* attributes (highest priority)
      for (const attr of element.attributes) {
        if (attr.name.startsWith(STYLE_PREFIX) && attr.name !== `${ATTR_PREFIX}style-options`) {
          const key = kebabToCamel(attr.name.slice(STYLE_PREFIX.length));
          let value = attr.value;

          if (/^\d+$/.test(value)) {
            value = parseInt(value, 10);
          } else if (/^\d+\.\d+$/.test(value)) {
            value = parseFloat(value);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          }

          styleOptions[key] = value;
        }
      }

      return styleOptions;
    }

    /**
     * Load WebChat script from CDN
     */
    function loadWebChatScript() {
      return new Promise((resolve, reject) => {
        if (window.WebChat) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = WEBCHAT_CDN;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load WebChat from CDN'));
        document.head.appendChild(script);
      });
    }

    /**
     * Fetch Direct Line token from endpoint
     */
    async function fetchToken(tokenUrl) {
      const response = await fetch(tokenUrl);

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('Token endpoint response missing "token" field');
      }

      return data.token;
    }

    /**
     * Render WebChat into a container
     */
    async function renderChat(chatContainer, element, tokenUrl, sendStartEvent, mockWelcome) {
      const token = await fetchToken(tokenUrl);
      const directLine = window.WebChat.createDirectLine({ token });

      const options = {
        directLine,
        styleOptions: parseStyleOptions(element)
      };

      const userId = element.getAttribute(`${ATTR_PREFIX}user-id`);
      if (userId) options.userID = userId;

      const username = element.getAttribute(`${ATTR_PREFIX}username`);
      if (username) options.username = username;

      const locale = element.getAttribute(`${ATTR_PREFIX}locale`);
      if (locale) options.locale = locale;

      // If mock welcome is enabled, create a store that injects a fake welcome message
      if (mockWelcome) {
        const mockWelcomeText = element.getAttribute(`${ATTR_PREFIX}mock-welcome-text`)
          || element.getAttribute(`${ATTR_PREFIX}mock-welcome`)
          || 'Welcome! How can I help you today?';

        options.store = window.WebChat.createStore({}, ({ dispatch }) => next => action => {
          if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
            dispatch({
              type: 'DIRECT_LINE/INCOMING_ACTIVITY',
              payload: {
                activity: {
                  type: 'message',
                  id: 'welcome-' + Date.now(),
                  timestamp: new Date().toISOString(),
                  from: { id: 'bot', role: 'bot' },
                  text: mockWelcomeText
                }
              }
            });
          }
          return next(action);
        });
      }

      // Clear and render
      chatContainer.innerHTML = '';
      window.WebChat.renderWebChat(options, chatContainer);

      // Send conversation start event to trigger agent welcome message
      // Skip if mock welcome is enabled (we're showing a fake message instead)
      if (sendStartEvent && !mockWelcome) {
        directLine.postActivity({
          type: 'event',
          name: 'startConversation',
          from: { id: userId || 'user' }
        }).subscribe();
      }

      return directLine;
    }

    /**
     * Initialize WebChat on a single element
     */
    async function initializeWebChat(element) {
      const tokenUrl = element.getAttribute(`${ATTR_PREFIX}token-url`);

      if (!tokenUrl) {
        console.error('webchat-embed: Missing required data-webchat-token-url attribute');
        return;
      }

      injectStyles();

      // Get configuration
      const title = element.getAttribute(`${ATTR_PREFIX}title`) || 'Chat';
      const bubbleText = element.getAttribute(`${ATTR_PREFIX}bubble-text`) || '';
      const startMinimized = element.getAttribute(`${ATTR_PREFIX}minimized`) !== 'false';
      const preload = element.getAttribute(`${ATTR_PREFIX}preload`) === 'true';
      const sendStartEvent = element.getAttribute(`${ATTR_PREFIX}send-start-event`) !== 'false';
      const mockWelcome = element.hasAttribute(`${ATTR_PREFIX}mock-welcome`);

      // Detect accent color: explicit attribute > CSS variables > default
      const detectedAccent = detectCSSVariable(
        '--primary-color',
        '--accent-color',
        '--brand-color',
        '--color-primary',
        '--theme-primary'
      );
      const headerBg = element.getAttribute(`${ATTR_PREFIX}header-background`)
        || element.getAttribute(`${ATTR_PREFIX}style-accent-color`)
        || detectedAccent
        || '#0078d4';
      const headerColor = element.getAttribute(`${ATTR_PREFIX}header-color`) || '#ffffff';

      // State
      let isMinimized = startMinimized;
      let chatInitialized = false;

      // Add minimized class to parent element if starting minimized
      if (isMinimized) {
        element.classList.add('webchat-embed-minimized');
      }

      // Create floating bubble (using textContent for bubbleText to prevent XSS)
      const bubble = document.createElement('button');
      bubble.className = 'webchat-embed-bubble' + (bubbleText ? '' : ' webchat-embed-bubble-icon-only');
      bubble.innerHTML = ICONS.chat;
      if (bubbleText) {
        const bubbleTextSpan = document.createElement('span');
        bubbleTextSpan.textContent = bubbleText;
        bubble.appendChild(bubbleTextSpan);
      }
      bubble.style.setProperty('--webchat-header-bg', headerBg);
      bubble.style.setProperty('--webchat-header-color', headerColor);
      bubble.title = 'Open chat';
      if (!isMinimized) bubble.classList.add('hidden');

      // Create main container
      const container = document.createElement('div');
      container.className = 'webchat-embed-container';

      // Create header
      const header = document.createElement('div');
      header.className = 'webchat-embed-header';
      header.style.setProperty('--webchat-header-bg', headerBg);
      header.style.setProperty('--webchat-header-color', headerColor);

      const titleEl = document.createElement('span');
      titleEl.className = 'webchat-embed-header-title';
      titleEl.textContent = title;

      const actions = document.createElement('div');
      actions.className = 'webchat-embed-header-actions';

      // Restart button
      const restartBtn = document.createElement('button');
      restartBtn.className = 'webchat-embed-header-btn';
      restartBtn.innerHTML = ICONS.restart;
      restartBtn.title = 'Restart conversation';

      // Minimize button
      const minimizeBtn = document.createElement('button');
      minimizeBtn.className = 'webchat-embed-header-btn';
      minimizeBtn.innerHTML = ICONS.minimize;
      minimizeBtn.title = 'Minimize';

      actions.appendChild(restartBtn);
      actions.appendChild(minimizeBtn);
      header.appendChild(titleEl);
      header.appendChild(actions);

      // Helper to show spinner
      function showSpinner(container) {
        container.innerHTML = `<div class="webchat-embed-loading"><div class="webchat-embed-spinner" style="--webchat-header-bg: ${headerBg}"></div></div>`;
      }

      // Create chat area
      let chatContainer = document.createElement('div');
      chatContainer.className = 'webchat-embed-chat';
      showSpinner(chatContainer);

      container.appendChild(header);
      container.appendChild(chatContainer);

      element.appendChild(bubble);
      element.appendChild(container);

      // Toggle functions
      function expand() {
        isMinimized = false;
        element.classList.remove('webchat-embed-minimized');
        bubble.classList.add('hidden');

        if (!chatInitialized) {
          initChat();
        }
      }

      function minimize() {
        isMinimized = true;
        element.classList.add('webchat-embed-minimized');
        bubble.classList.remove('hidden');
      }

      // Initialize chat
      async function initChat(triggerStartEvent = true) {
        try {
          await loadWebChatScript();
          await renderChat(chatContainer, element, tokenUrl, sendStartEvent && triggerStartEvent, mockWelcome);
          chatInitialized = true;
        } catch (error) {
          console.error('webchat-embed: Initialization failed', error);
          chatContainer.textContent = 'Failed to load chat. Please refresh the page.';
        }
      }

      // Restart conversation - recreate chat container for clean slate
      async function restart() {
        // Remove old chat container completely
        const oldContainer = chatContainer;
        chatContainer = document.createElement('div');
        chatContainer.className = 'webchat-embed-chat';
        showSpinner(chatContainer);
        container.replaceChild(chatContainer, oldContainer);

        try {
          await renderChat(chatContainer, element, tokenUrl, sendStartEvent, mockWelcome);
        } catch (error) {
          console.error('webchat-embed: Restart failed', error);
          chatContainer.textContent = 'Failed to restart. Please try again.';
        }
      }

      // Event listeners
      bubble.addEventListener('click', expand);
      minimizeBtn.addEventListener('click', minimize);
      restartBtn.addEventListener('click', restart);

      // Preload: initialize immediately even if minimized
      if (preload) {
        loadWebChatScript().then(() => initChat(true));
      }
      // Otherwise, initialize only when expanded (and not minimized on start)
      else if (!isMinimized) {
        loadWebChatScript().then(() => initChat(true));
      }
    }

    /**
     * Find all WebChat containers and initialize them
     */
    function initializeAll() {
      const containers = document.querySelectorAll(`[${ATTR_PREFIX}token-url]`);
      containers.forEach(initializeWebChat);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAll);
    } else {
      initializeAll();
    }

    // Expose for programmatic use if needed
    window.WebChatEmbed = {
      init: initializeAll,
      initElement: initializeWebChat
    };

  })();

})();
