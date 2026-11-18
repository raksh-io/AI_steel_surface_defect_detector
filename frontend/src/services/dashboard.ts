import apiClient from './api';
import type { DashboardStats, DashboardAnalytics } from '../types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/api/dashboard/stats');
    return data;
  },

  async getAnalytics(days?: number): Promise<DashboardAnalytics> {
    const params = days ? `?days=${days}` : '';
    const { data } = await apiClient.get<DashboardAnalytics>(`/api/dashboard/analytics${params}`);
    return data;
  },
};
