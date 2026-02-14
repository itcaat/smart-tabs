/**
 * ScriptRunner - manages a sandboxed iframe for executing user scripts.
 * 
 * The sandbox iframe can eval() arbitrary JS but has no access to chrome.* APIs.
 * Network requests (fetchData) are proxied through this module to avoid CORS issues
 * since the extension page (chrome-extension://) has unrestricted fetch.
 */

let sandboxFrame = null;
let sandboxReady = false;
let readyCallbacks = [];

// Pending script executions: scriptId -> { resolve, reject, timer }
const pendingScripts = new Map();
let scriptIdCounter = 0;

const SCRIPT_TIMEOUT_MS = 10000; // 10s timeout for script execution

/**
 * Initialize the sandbox iframe (call once on app mount).
 * Returns a promise that resolves when the sandbox is ready.
 */
export function initSandbox() {
  if (sandboxFrame) {
    return sandboxReady
      ? Promise.resolve()
      : new Promise((resolve) => readyCallbacks.push(resolve));
  }

  return new Promise((resolve) => {
    readyCallbacks.push(resolve);

    sandboxFrame = document.createElement('iframe');
    sandboxFrame.src = '/sandbox.html';
    sandboxFrame.style.display = 'none';
    sandboxFrame.id = 'script-sandbox';
    document.body.appendChild(sandboxFrame);

    window.addEventListener('message', handleMessage);
  });
}

/**
 * Destroy the sandbox iframe (call on app unmount if needed).
 */
export function destroySandbox() {
  if (sandboxFrame) {
    window.removeEventListener('message', handleMessage);
    sandboxFrame.remove();
    sandboxFrame = null;
    sandboxReady = false;
    readyCallbacks = [];

    // Reject all pending scripts
    for (const [, pending] of pendingScripts) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Sandbox destroyed'));
    }
    pendingScripts.clear();
  }
}

/**
 * Execute a user script in the sandbox.
 * @param {string} code - The JavaScript code to execute
 * @returns {Promise<{value: string|number, label?: string, color?: string}>}
 */
export async function executeScript(code) {
  if (!sandboxFrame || !sandboxReady) {
    await initSandbox();
  }

  return new Promise((resolve, reject) => {
    const scriptId = ++scriptIdCounter;

    const timer = setTimeout(() => {
      if (pendingScripts.has(scriptId)) {
        pendingScripts.delete(scriptId);
        reject(new Error('Script timeout (10s)'));
      }
    }, SCRIPT_TIMEOUT_MS);

    pendingScripts.set(scriptId, { resolve, reject, timer });

    sandboxFrame.contentWindow.postMessage({
      type: 'executeScript',
      scriptId,
      code
    }, '*');
  });
}

/**
 * Handle messages from the sandbox iframe.
 */
function handleMessage(event) {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'sandboxReady':
      sandboxReady = true;
      readyCallbacks.forEach((cb) => cb());
      readyCallbacks = [];
      break;

    case 'scriptResult': {
      const pending = pendingScripts.get(msg.scriptId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingScripts.delete(msg.scriptId);

        // Sanitize result: only extract value, label, color
        const raw = msg.result || {};
        const result = {
          value: raw.value !== undefined ? String(raw.value) : '—',
        };
        if (raw.label) result.label = String(raw.label);
        if (raw.color) result.color = String(raw.color);
        pending.resolve(result);
      }
      break;
    }

    case 'scriptError': {
      const pending = pendingScripts.get(msg.scriptId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingScripts.delete(msg.scriptId);
        pending.reject(new Error(msg.error || 'Script error'));
      }
      break;
    }

    case 'fetchRequest':
      handleFetchProxy(msg);
      break;
  }
}

/**
 * Proxy fetch requests from sandbox through the extension page.
 * The extension page has no CORS restrictions.
 */
async function handleFetchProxy(msg) {
  const { requestId, url, options } = msg;

  try {
    const fetchOptions = {};
    if (options.method) fetchOptions.method = options.method;
    if (options.headers) fetchOptions.headers = options.headers;
    if (options.body) fetchOptions.body = options.body;

    const response = await fetch(url, fetchOptions);
    const body = await response.text();

    sandboxFrame.contentWindow.postMessage({
      type: 'fetchResponse',
      requestId,
      body,
      status: response.status
    }, '*');
  } catch (err) {
    sandboxFrame.contentWindow.postMessage({
      type: 'fetchResponse',
      requestId,
      error: err.message || 'Fetch failed'
    }, '*');
  }
}
