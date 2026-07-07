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

  async getHistory(skip = 0, limit = 20, defectClass?: string, source?: string): Promise<InspectionListResponse> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (defectClass) params.append('defect_class', defectClass);
    if (source) params.append('source', source);
    
    const { data } = await apiClient.get<InspectionListResponse>(`/api/inspect/history?${params.toString()}`);
    return data;
  },

  async getInspection(id: number): Promise<InspectionRecord> {
    const { data } = await apiClient.get<InspectionRecord>(`/api/inspect/history/${id}`);
    return data;
  },

  async deleteInspection(id: number): Promise<void> {
    await apiClient.delete(`/api/inspect/history/${id}`);
  }
};
