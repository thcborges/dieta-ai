import '@testing-library/jest-dom';

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
