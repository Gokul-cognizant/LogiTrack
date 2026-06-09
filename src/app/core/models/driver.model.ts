// Mirrors com.cts.dto.DriverRideResponse
export interface DriverRide {
  scheduleId: number;
  shipmentId: number;
  origin: string;
  destination: string;
  receiverName: string;
  receiverPhone: string;
  departureAt: string;
  arrivalAt: string;
  status: string;
  vehicleId: number;
  routeId: number;
}

export interface DeliveryCompletionRequest {
  otp: string;
  fileUri: string;
  distance: number;
  notes?: string;
}

export interface DeliveryRecord {
  deliveryId: number;
  orderId: number;
  vehicleId: number;
  driverId: number;
  deliveredAt: string;
  status: string;
}
