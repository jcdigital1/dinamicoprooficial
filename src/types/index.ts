export type UserRole = 'admin' | 'owner' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface QRPlacement {
  x: number;     // Normalized (0.0 to 1.0)
  y: number;     // Normalized (0.0 to 1.0)
  size: number;  // Normalized relative to image width (0.0 to 1.0)
  rotation?: number;
  bgPadding?: number; // Extra padding in % for white background patch
}

export interface PlateModel {
  id: string;
  name: string;
  category: 'google' | 'instagram' | 'whatsapp' | 'wifi' | 'pix' | 'custom' | 'outro';
  imageUrl: string;
  qrPlacement: QRPlacement;
  isCalibrated: boolean;
  isDefault?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PlateStatus = 'pending' | 'active' | 'disabled';

export interface Plate {
  id: string;
  plateNumber: string;        // e.g. "PLACA-000001"
  sequenceIndex: number;      // e.g. 1
  batchId: string;
  modelId: string;
  modelVersion?: string;      // e.g. "v2" - original artwork version reference
  modelName: string;
  publicSlug: string;         // e.g. "dnp_8f4a2b"
  publicUrl: string;          // e.g. "https://domain.com/q/dnp_8f4a2b"
  customerName: string;       // e.g. "Restaurante Sabor & Arte"
  targetUrl: string;          // e.g. "https://instagram.com/sabor"
  status: PlateStatus;
  qrPlacement: QRPlacement;
  clicksCount: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  batchNumber: number;
  batchCode: string;          // e.g. "LOTE-001"
  modelId: string;
  modelName: string;
  modelCategory: string;
  quantity: number;
  startPlateNumber: string;
  endPlateNumber: string;
  status: 'processing' | 'completed' | 'failed';
  userId: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  publicDomain: string;
  installationName: string;
  companyContact?: string;
  initialized: boolean;
  updatedAt?: string;
}

export interface DetectionResult {
  detected: boolean;
  placement?: QRPlacement;
  decodedText?: string;
  confidence?: number;
  message?: string;
}
