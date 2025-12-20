import axios from "axios";

const raw = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const baseURL = raw.replace(/\/+$/, ""); // trim trailing slashes

console.log("[API BASE]", baseURL); // TEMP: confirm in console

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Surface full error for debugging
    console.error("[API ERROR]", {
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Don’t hard redirect during debugging; just throw the error
      // window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
