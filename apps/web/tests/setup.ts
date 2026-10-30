import '@testing-library/jest-dom';

// Polyfill hermético para localStorage em ambientes Node 22 (onde globalThis.localStorage requer --localstorage-file)
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, String(value)); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
  get length() { return storage.size; },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
}

// Fallback hermético para chamadas fetch relativas em testes unitários/componentes
const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/')) {
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true, meals: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  return originalFetch ? originalFetch(input, init) : Promise.reject(new Error('fetch not available'));
}) as typeof fetch;
