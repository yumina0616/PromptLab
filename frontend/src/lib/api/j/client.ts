import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const baseConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

export const apiClient = axios.create({
  ...baseConfig,
  withCredentials: true,
});

export const publicApiClient = axios.create({
  ...baseConfig,
  withCredentials: true,
});

const attachInterceptors = (client: typeof apiClient) => {
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      return Promise.reject(error);
    }
  );
};

attachInterceptors(apiClient);
attachInterceptors(publicApiClient);
