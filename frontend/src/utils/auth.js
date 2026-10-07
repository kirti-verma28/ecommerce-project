// src/utils/auth.js
const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const saveTokens = (tokens) => {
  localStorage.setItem("access_token", tokens.access);
  localStorage.setItem("refresh_token", tokens.refresh);
};

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

export const getAccessToken = () => localStorage.getItem("access_token");
export const getRefreshToken = () => localStorage.getItem("refresh_token");

let refreshPromise = null;

// Refresh token se naya access token lo (ek saath kai requests fail hon to bhi refresh sirf ek baar)
const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/api/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem("access_token", data.access);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const logoutAndRedirect = () => {
  clearTokens();
  window.location.href = "/login";
};

export const authFetch = async (url, options = {}) => {
  const doFetch = () => {
    const headers = options.headers ? { ...options.headers } : {};
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    return fetch(url, { ...options, headers });
  };

  let res = await doFetch();
  if (res.status !== 401) return res;

  // Token expire ho gaya: naya token lo aur ek baar dobara try karo
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    logoutAndRedirect();
    return res;
  }

  res = await doFetch();
  if (res.status === 401) logoutAndRedirect();
  return res;
};