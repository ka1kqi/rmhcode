const API_BASE = process.env.RMHCODE_API_URL || 'https://rmhstudios.com';

export async function apiRequest(path, options = {}) {
  const { method = 'GET', token, body, params } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['X-RMHCode-Token'] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

export { API_BASE };
