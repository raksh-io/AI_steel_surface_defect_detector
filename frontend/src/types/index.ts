// Core API types

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface InspectionRecord {
  id: number;
  user_id: number;
  defect_class: string;
  class_index: number;
  confidence: number;
  is_defect: boolean;
  original_image_path: string | null;
  gradcam_image_path: string | null;
  source: string;
  notes: string | null;
  created_at: string;
}

export interface InspectionListResponse {
  total: number;
  items: InspectionRecord[];
}

export interface PredictionResult {
  inspection_id: number;
  defect_class: string;
  class_index: number;
  confidence: number;
  is_defect: boolean;
  gradcam_base64: string;
  original_base64: string;
  source: string;
}

export interface ClassDistributionItem {
  defect_class: string;
  count: number;
}

export interface DashboardStats {
  total_inspections: number;
  total_defects: number;
  defect_rate: number;
  class_distribution: ClassDistributionItem[];
  recent_inspections: InspectionRecord[];
}
