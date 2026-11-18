import apiClient from './api';
import type { PredictionResult, InspectionListResponse, InspectionRecord } from '../types';

export const inspectionService = {
  async uploadImage(file: File): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await apiClient.post<PredictionResult>('/api/inspect/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async uploadWebcamFrame(base64Frame: string): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('frame_b64', base64Frame);
    
    const { data } = await apiClient.post<PredictionResult>('/api/inspect/webcam-frame', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async getHistory(
    skip = 0,
    limit = 20,
    defectClass?: string,
    source?: string,
    isDefect?: boolean,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<InspectionListResponse> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (defectClass) params.append('defect_class', defectClass);
    if (source) params.append('source', source);
    if (isDefect !== undefined) params.append('is_defect', isDefect.toString());
    if (search) params.append('search', search);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const { data } = await apiClient.get<InspectionListResponse>(`/api/inspect/history?${params.toString()}`);
    return data;
  },

  async updateNotes(id: number, notes: string): Promise<InspectionRecord> {
    const { data } = await apiClient.patch<InspectionRecord>(`/api/inspect/history/${id}/notes`, { notes });
    return data;
  },

  async exportInspections(
    format: 'csv' | 'json' = 'csv',
    filters?: {
      defectClass?: string;
      source?: string;
      isDefect?: boolean;
      search?: string;
    }
  ): Promise<void> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters?.defectClass) params.append('defect_class', filters.defectClass);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.isDefect !== undefined) params.append('is_defect', filters.isDefect.toString());
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`/api/inspect/export?${params.toString()}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `steel_inspections_${dateStr}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getInspection(id: number): Promise<InspectionRecord> {
    const { data } = await apiClient.get<InspectionRecord>(`/api/inspect/history/${id}`);
    return data;
  },

  async deleteInspection(id: number): Promise<void> {
    await apiClient.delete(`/api/inspect/history/${id}`);
  }
};
