export type ScheduleStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type RouteStatus = 'ACTIVE' | 'INACTIVE';

export interface Route {
  routeId: number;
  name: string;
  stopsJson: string;
  distanceKm: number;
  status: RouteStatus;
}

export interface RouteSchedule {
  scheduleId: number;
  shipmentId: number;
  vehicleId: number;
  routeId: number;
  departureAt: string;
  arrivalAt: string;
  dispatcherId: number;
  status: ScheduleStatus;
}

export interface DispatchRequest {
  shipmentId: number;
  vehicleId: number;
  routeId: number;
  driverId: number;
  departureAt: string;
  arrivalAt: string;
}

export interface DispatchResponse {
  message: string;
  scheduleId: number;
  assignId: number;
  driverId: number;
  vehicleId: number;
  routeId: number;
  shipmentId: number;
  departureAt: string;
  arrivalAt: string;
  scheduleStatus: ScheduleStatus;
  assignmentStatus: string;
  dispatcherId: number;
}

export interface DriverAssignment {
  assignId: number;
  driverId: number;
  vehicleId: number;
  routeId: number;
  assignedBy: number;
  assignedAt: string;
  status: string;
}
