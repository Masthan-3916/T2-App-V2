// src/services/api.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token if it exists
apiClient.interceptors.request.use((config) => {
  // If no auth header, try to get from localStorage (Zustand persist)
  if (!config.headers.Authorization) {
    try {
      const persisted = localStorage.getItem('t2-auth');
      if (persisted) {
        const state = JSON.parse(persisted).state;
        if (state.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      }
    } catch (e) {
      console.warn('Failed to parse auth token from storage', e);
    }
  }
  return config;
});

// Response interceptor — auto-refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshRes = await apiClient.post('/auth/refresh');
        const newToken = refreshRes.data.data?.access_token;
        if (newToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Refresh failed — redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Service functions ────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/users', { params }),
  get: (id: string) => apiClient.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

export const driversApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/drivers', { params }),
  get: (id: string) => apiClient.get(`/drivers/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/drivers', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/drivers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/drivers/${id}`),
  assignVehicle: (id: string, vehicleId: string) =>
    apiClient.post(`/drivers/${id}/assign-vehicle`, { vehicle_id: vehicleId }),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/drivers/${id}/status`, { status }),
  updateLocation: (id: string, lat: number, lng: number, accuracy?: number) =>
    apiClient.post(`/drivers/${id}/location`, { latitude: lat, longitude: lng, accuracy }),
  getLocation: (id: string) => apiClient.get(`/drivers/${id}/location`),
  listAllLocations: () => apiClient.get('/drivers/all/locations'),
};

export const vehiclesApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/vehicles', { params }),
  get: (id: string) => apiClient.get(`/vehicles/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/vehicles', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/vehicles/${id}`, data),
  delete: (id: string) => apiClient.delete(`/vehicles/${id}`),
  assignDriver: (id: string, driverId: string) =>
    apiClient.post(`/vehicles/${id}/assign-driver`, { driver_id: driverId }),
};

export const ordersApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/orders', { params }),
  get: (id: string) => apiClient.get(`/orders/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/orders', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/orders/${id}`, data),
  updateStatus: (id: string, status: string, note?: string) =>
    apiClient.patch(`/orders/${id}/status`, { status, note }),
  assignDriver: (id: string, driverId: string) =>
    apiClient.post(`/orders/${id}/assign-driver`, { driver_id: driverId }),
  getTimeline: (id: string) => apiClient.get(`/orders/${id}/timeline`),
};

export const dashboardApi = {
  summary: () => apiClient.get('/dashboard/summary'),
  driverUtilization: () => apiClient.get('/dashboard/driver-utilization'),
  orderMetrics: () => apiClient.get('/dashboard/order-metrics'),
};
