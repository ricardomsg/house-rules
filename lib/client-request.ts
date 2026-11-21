// A dropped Wi-Fi connection must not leave every button disabled indefinitely.
// The deadline also applies while the caller reads the response body.
export function clientRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(12_000) });
}
