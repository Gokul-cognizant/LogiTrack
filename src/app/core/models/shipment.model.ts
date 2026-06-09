export type ShipmentStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Shipment {
  shipmentId: number;
  customerId: number;
  origin: string;
  destination: string;
  weight: number;
  receiverName: string;
  receiverPhone: string;
  status: ShipmentStatus;
  orderDate?: string;
  deliveryOtp?: string;
}

export interface ShipmentRequest {
  origin: string;
  destination: string;
  weight: number;
  receiverName: string;
  receiverPhone: string;
}
