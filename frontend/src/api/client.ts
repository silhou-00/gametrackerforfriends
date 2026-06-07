import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Local network auth token (from LAN-Auth pairing, stored in state for now)
let lanAuthToken: string | null = null;

export const setLanAuthToken = (token: string) => {
  lanAuthToken = token;
};

// Request interceptor: attach LAN-Auth token
apiClient.interceptors.request.use((config) => {
  if (lanAuthToken) {
    config.headers.Authorization = `Bearer ${lanAuthToken}`;
  }
  return config;
});

// Response interceptor: standardized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const data = error.response?.data as any;
    const message = data?.error?.message || error.message;
    const code = data?.error?.code || 'UNKNOWN_ERROR';

    console.error(`[API Error] ${code}: ${message}`);

    return Promise.reject({
      code,
      message,
      statusCode: error.response?.status,
      originalError: error,
    });
  }
);

export default apiClient;
