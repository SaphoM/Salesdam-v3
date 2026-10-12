/**
 * API Configuration
 * Uses environment variables for dynamic URL configuration
 */

const API_VERSION = 'v1';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

/**
 * Get the full API endpoint URL
 * @param {string} endpoint - The endpoint path (e.g., '/integrations')
 * @returns {string} Full URL for the API endpoint
 */
export const getApiUrl = (endpoint) => {
  return `${API_URL}${endpoint}`;
};

/**
 * Get the base URL for integrations (without v1)
 * This is useful for backwards compatibility or public endpoints
 */
export const getBaseUrl = () => {
  return `${API_BASE_URL}/api`;
};

export default {
  API_URL,
  API_BASE_URL,
  API_VERSION,
  getApiUrl,
  getBaseUrl,
};
