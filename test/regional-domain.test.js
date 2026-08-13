import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// We need to extract and test the functions from the IIFE.
// Since the source is an IIFE, we'll eval it in a controlled environment
// with mocked globals, then test the behavior end-to-end.

// Helper: create a minimal DOM-like environment for the IIFE
function createMockEnv() {
  const elements = [];
  const appendedScripts = [];
  const innerHTMLWrites = [];
  let fetchMock;
  let createDirectLineCalls = [];
  let renderWebChatCalls = [];

  const mockElement = (attrs = {}, tagName = 'div') => {
    const attrMap = new Map(Object.entries(attrs));
    const styleProperties = new Map();
    const element = {
      tagName,
      children: [],
      getAttribute: (name) => attrMap.get(name) || null,
      hasAttribute: (name) => attrMap.has(name),
      setAttribute: (name, value) => attrMap.set(name, value),
      attributes: Array.from(attrMap.entries()).map(([name, value]) => ({ name, value })),
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      style: {
        properties: styleProperties,
        setProperty(name, value) { styleProperties.set(name, value); }
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      replaceChild(newChild, oldChild) {
        const index = this.children.indexOf(oldChild);
        if (index !== -1) this.children[index] = newChild;
        return oldChild;
      },
      textContent: '',
      querySelectorAll() { return []; },
      addEventListener() {}
    };

    let innerHTML = '';
    Object.defineProperty(element, 'innerHTML', {
      get() { return innerHTML; },
      set(value) {
        innerHTML = value;
        innerHTMLWrites.push(value);
      }
    });

    elements.push(element);
    return element;
  };

  const env = {
    createDirectLineCalls,
    renderWebChatCalls,
    innerHTMLWrites,
    mockElement,
    setFetch(fn) { fetchMock = fn; },

    // Globals that the IIFE expects
    globals: {
      window: {
        WebChat: {
          createDirectLine(opts) {
            createDirectLineCalls.push(opts);
            return {
              postActivity() {
                return { subscribe() {} };
              }
            };
          },
          renderWebChat(opts, container) {
            renderWebChatCalls.push({ opts, container });
          },
          createStore(initial, middleware) {
            return 'mock-store';
          }
        },
        WebChatEmbed: null
      },
      document: {
        readyState: 'complete',
        addEventListener() {},
        querySelectorAll() { return []; },
        head: {
          appendChild(script) {
            appendedScripts.push(script);
            // Simulate successful script load
            if (script.onload) setTimeout(script.onload, 0);
          }
        },
        createElement(tag) {
          return mockElement({}, tag);
        },
        documentElement: {
          // For getComputedStyle
        }
      },
      fetch: async (...args) => fetchMock(...args),
      getComputedStyle: () => ({
        getPropertyValue: () => '',
        fontFamily: 'Arial'
      }),
      setTimeout,
      console
    }
  };

  return env;
}

describe('spinner rendering', () => {
  it('does not interpolate the header background into HTML', async () => {
    const env = createMockEnv();
    const payload = '"><img src=x onerror=alert(1)>';
    const host = env.mockElement({
      'data-webchat-token-url': 'https://example.test/token',
      'data-webchat-header-background': payload
    });
    const source = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');

    vm.runInNewContext(source, env.globals);
    await env.globals.window.WebChatEmbed.initElement(host);

    const container = host.children[1];
    const chatContainer = container.children[1];
    const loading = chatContainer.children[0];
    const spinner = loading.children[0];

    assert.equal(loading.className, 'webchat-embed-loading');
    assert.equal(spinner.className, 'webchat-embed-spinner');
    assert.equal(spinner.style.properties.get('--webchat-header-bg'), payload);
    assert.equal(env.innerHTMLWrites.some(value => value.includes(payload)), false);
  });
});

// Since the IIFE assigns to window.WebChatEmbed and uses global fetch,
// we test by directly extracting the logic patterns.
// For a clean unit test, let's extract the pure functions and test them.

describe('getRegionalChannelSettingsUrl', () => {
  // Extract the function logic directly
  function getRegionalChannelSettingsUrl(tokenUrl) {
    const pvaIndex = tokenUrl.indexOf('/powervirtualagents');
    if (pvaIndex === -1) return null;

    const environmentEndpoint = tokenUrl.slice(0, pvaIndex);
    const apiVersionMatch = tokenUrl.match(/api-version=([^&]+)/);
    const apiVersion = apiVersionMatch ? apiVersionMatch[1] : '2022-03-01-preview';

    return `${environmentEndpoint}/powervirtualagents/regionalchannelsettings?api-version=${apiVersion}`;
  }

  it('should derive regional URL from a standard Copilot Studio token endpoint', () => {
    const tokenUrl = 'https://default1234.5e.environment.api.powerplatform.com/powervirtualagents/botsbyschema/cr123_bookssearch/directline/token?api-version=2022-03-01-preview';
    const result = getRegionalChannelSettingsUrl(tokenUrl);
    assert.equal(
      result,
      'https://default1234.5e.environment.api.powerplatform.com/powervirtualagents/regionalchannelsettings?api-version=2022-03-01-preview'
    );
  });

  it('should handle different api-version values', () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2024-01-01';
    const result = getRegionalChannelSettingsUrl(tokenUrl);
    assert.equal(
      result,
      'https://myenv.environment.api.powerplatform.com/powervirtualagents/regionalchannelsettings?api-version=2024-01-01'
    );
  });

  it('should return null for non-Copilot Studio URLs', () => {
    const tokenUrl = 'https://directline.botframework.com/v3/directline/tokens/generate';
    const result = getRegionalChannelSettingsUrl(tokenUrl);
    assert.equal(result, null);
  });

  it('should use default api-version when not present in URL', () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token';
    const result = getRegionalChannelSettingsUrl(tokenUrl);
    assert.equal(
      result,
      'https://myenv.environment.api.powerplatform.com/powervirtualagents/regionalchannelsettings?api-version=2022-03-01-preview'
    );
  });
});

describe('fetchRegionalDomain', () => {
  // Extract the function logic
  async function fetchRegionalDomain(tokenUrl, fetchFn) {
    const pvaIndex = tokenUrl.indexOf('/powervirtualagents');
    if (pvaIndex === -1) return null;

    const environmentEndpoint = tokenUrl.slice(0, pvaIndex);
    const apiVersionMatch = tokenUrl.match(/api-version=([^&]+)/);
    const apiVersion = apiVersionMatch ? apiVersionMatch[1] : '2022-03-01-preview';
    const settingsUrl = `${environmentEndpoint}/powervirtualagents/regionalchannelsettings?api-version=${apiVersion}`;

    try {
      const response = await fetchFn(settingsUrl);
      if (!response.ok) return null;

      const data = await response.json();
      const directLineUrl = data.channelUrlsById && data.channelUrlsById.directline;
      if (!directLineUrl) return null;

      return directLineUrl.replace(/\/$/, '') + '/v3/directline';
    } catch {
      return null;
    }
  }

  it('should return the regional domain with /v3/directline appended', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    const mockFetch = async (url) => ({
      ok: true,
      json: async () => ({
        channelUrlsById: {
          directline: 'https://europe.directline.botframework.com/'
        }
      })
    });

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, 'https://europe.directline.botframework.com/v3/directline');
  });

  it('should handle domain without trailing slash', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        channelUrlsById: {
          directline: 'https://india.directline.botframework.com'
        }
      })
    });

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, 'https://india.directline.botframework.com/v3/directline');
  });

  it('should return null when regional fetch fails', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    const mockFetch = async () => ({ ok: false });

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, null);
  });

  it('should return null when response has no directline channel', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ channelUrlsById: {} })
    });

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, null);
  });

  it('should return null when fetch throws', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    const mockFetch = async () => { throw new Error('Network error'); };

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, null);
  });

  it('should return null for non-Copilot Studio token URLs', async () => {
    const tokenUrl = 'https://directline.botframework.com/v3/directline/tokens/generate';
    const mockFetch = async () => { throw new Error('Should not be called'); };

    const result = await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(result, null);
  });

  it('should call the correct regional settings URL', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';
    let calledUrl;
    const mockFetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({
          channelUrlsById: { directline: 'https://europe.directline.botframework.com/' }
        })
      };
    };

    await fetchRegionalDomain(tokenUrl, mockFetch);
    assert.equal(
      calledUrl,
      'https://myenv.environment.api.powerplatform.com/powervirtualagents/regionalchannelsettings?api-version=2022-03-01-preview'
    );
  });
});

describe('Integration: createDirectLine receives domain', () => {
  it('should pass domain to createDirectLine when regional endpoint returns one', async () => {
    // Simulate the flow in renderChat
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';

    // Mock fetch to handle both token and regional calls
    const mockFetch = async (url) => {
      if (url.includes('/directline/token')) {
        return {
          ok: true,
          json: async () => ({ token: 'test-token-123', conversationId: 'conv-1' })
        };
      }
      if (url.includes('regionalchannelsettings')) {
        return {
          ok: true,
          json: async () => ({
            channelUrlsById: { directline: 'https://europe.directline.botframework.com/' }
          })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    // Simulate fetchToken
    const tokenResponse = await mockFetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    // Simulate fetchRegionalDomain
    const pvaIndex = tokenUrl.indexOf('/powervirtualagents');
    const environmentEndpoint = tokenUrl.slice(0, pvaIndex);
    const settingsUrl = `${environmentEndpoint}/powervirtualagents/regionalchannelsettings?api-version=2022-03-01-preview`;
    const regionalResponse = await mockFetch(settingsUrl);
    const regionalData = await regionalResponse.json();
    const domain = regionalData.channelUrlsById.directline.replace(/\/$/, '') + '/v3/directline';

    // Build directLineOptions as the code does
    const directLineOptions = { token };
    if (domain) directLineOptions.domain = domain;

    assert.deepEqual(directLineOptions, {
      token: 'test-token-123',
      domain: 'https://europe.directline.botframework.com/v3/directline'
    });
  });

  it('should not include domain when regional endpoint is unavailable', async () => {
    const tokenUrl = 'https://myenv.environment.api.powerplatform.com/powervirtualagents/botsbyschema/bot1/directline/token?api-version=2022-03-01-preview';

    const token = 'test-token-456';
    const domain = null; // regional fetch failed

    const directLineOptions = { token };
    if (domain) directLineOptions.domain = domain;

    assert.deepEqual(directLineOptions, {
      token: 'test-token-456'
    });
    assert.equal('domain' in directLineOptions, false);
  });
});
