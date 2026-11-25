class NetworkError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Fetch wrapper shared by the network adapters: JSON in/out, timeout, and safe error messages
// (upstream bodies are never echoed back because they can contain account details).
const requestJson = async (label, url, { headers = {}, timeoutMs = 20000 } = {}) => {
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new NetworkError(`${label} could not be reached`, 502);
  }
  if (response.status === 401 || response.status === 403) throw new NetworkError(`${label} rejected the credentials`, 400);
  if (!response.ok) throw new NetworkError(`${label} request failed (${response.status})`, 502);
  try {
    return await response.json();
  } catch {
    throw new NetworkError(`${label} returned an unreadable response`, 502);
  }
};

module.exports = { NetworkError, requestJson };
