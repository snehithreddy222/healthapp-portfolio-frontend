// src/services/http.js
import axios from "axios";

// Base URL comes from Vite env.
// In beta/prod: VITE_API_BASE_URL="/api" so calls go to https://healthapp-beta.../api
// In local dev: set VITE_API_BASE_URL=http://localhost:3000/api in .env.local
const rawBase = import.meta.env.VITE_API_BASE_URL || "";
const baseURL = rawBase.replace(/\/+$/, ""); // trim trailing slash

if (!baseURL) {
  console.warn(
    "[HTTP] VITE_API_BASE_URL is not set. Requests will likely fail. " +
      "Set it in your .env/.env.local or in the Docker build args."
  );
}

export const API_BASE = baseURL;

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage "user" object
http.interceptors.request.use((config) => {
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch {
    // ignore parse errors
  }

  config.withCredentials = false;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[HTTP ERROR]", {
      url: err.config?.url,
      method: err.config?.method,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
);

export default http;
