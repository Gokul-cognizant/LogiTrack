export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE';

export interface Vehicle {
  vehicleId: number;
  regNumber: string;
  type: string;
  capacity: number;
  status: VehicleStatus;
}

export interface VehicleRequest {
  regNumber: string;
  type: string;
  capacity: number;
}

export type InspectionStatus = 'PASSED' | 'FAILED';

export interface InspectionRecord {
  inspectionId: number;
  vehicleId: number;
  inspectorId?: number;
  performedAt: string;
  conditionRating: number;
  findings: string;
  photoUri?: string;
  status: InspectionStatus;
}

export interface InspectionRequest {
  vehicleId: number;
  conditionRating: number;
  findings: string;
  photoUri?: string;
  status: InspectionStatus;
}

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface MaintenanceRecord {
  maintId: number;
  vehicleId: number;
  inspectionId?: number;
  taskDescription: string;
  mechanicNotes?: string;
  performedBy?: string;
  performedAt?: string;
  cost?: number;
  status: MaintenanceStatus;
}

export interface MaintenanceCompleteRequest {
  cost: number;
  mechanicNotes: string;
}
