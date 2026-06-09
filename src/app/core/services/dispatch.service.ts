import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DispatchRequest, DispatchResponse, DriverAssignment,
  Route, RouteSchedule
} from '../models/dispatch.model';
import { Shipment } from '../models/shipment.model';

@Injectable({ providedIn: 'root' })
export class DispatchService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/dispatcher`;

  /* ---- Shipments proxy ---- */
  getShipments(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.base}/shipments`);
  }
  cancelShipment(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/shipments/${id}/cancel`, {});
  }
  cancelDispatch(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/shipments/${id}/cancel-dispatch`, {});
  }

  /* ---- Dispatch ---- */
  processDispatch(req: DispatchRequest): Observable<DispatchResponse> {
    return this.http.post<DispatchResponse>(`${this.base}/dispatch`, req);
  }

  /* ---- Assignments (new endpoints) ---- */
  getAllAssignments(): Observable<DriverAssignment[]> {
    return this.http.get<DriverAssignment[]>(`${this.base}/assignments`);
  }
  getAssignmentsByDriver(driverId: number): Observable<DriverAssignment[]> {
    return this.http.get<DriverAssignment[]>(`${this.base}/assignments/driver/${driverId}`);
  }
  getScheduleByShipment(shipmentId: number): Observable<RouteSchedule> {
    return this.http.get<RouteSchedule>(`${this.base}/schedules/shipment/${shipmentId}`);
  }

  /* ---- Routes ---- */
  createRoute(route: Partial<Route>): Observable<Route> {
    return this.http.post<Route>(`${this.base}/routes/create`, route);
  }
  getRoutes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.base}/routes/all-routes`);
  }
  getRoute(id: number): Observable<Route> {
    return this.http.get<Route>(`${this.base}/routes/${id}`);
  }
  updateRouteStatus(id: number, status: string): Observable<Route> {
    return this.http.patch<Route>(`${this.base}/routes/${id}/status?status=${status}`, {});
  }
  deleteRoute(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/routes/${id}`);
  }

  /* ---- Schedules ---- */
  createSchedule(s: Partial<RouteSchedule>): Observable<RouteSchedule> {
    return this.http.post<RouteSchedule>(`${this.base}/schedules/create`, s);
  }
  getAllSchedules(): Observable<RouteSchedule[]> {
    return this.http.get<RouteSchedule[]>(`${this.base}/schedules/route-schedule-all`);
  }
  getSchedule(id: number): Observable<RouteSchedule> {
    return this.http.get<RouteSchedule>(`${this.base}/schedules/${id}`);
  }
  getSchedulesByVehicle(id: number): Observable<RouteSchedule[]> {
    return this.http.get<RouteSchedule[]>(`${this.base}/schedules/vehicle/${id}`);
  }
  getSchedulesByDriver(id: number): Observable<RouteSchedule[]> {
    return this.http.get<RouteSchedule[]>(`${this.base}/schedules/driver/${id}`);
  }
  updateScheduleStatus(scheduleId: number, status: string): Observable<{ message: string }> {
    // Backend uses @RequestBody String — send as raw text
    return this.http.put<{ message: string }>(
      `${this.base}/schedules/${scheduleId}/status`,
      status,
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }
  deleteSchedule(scheduleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/schedules/${scheduleId}`);
  }
  checkAvailability(vehicleId: number, start: string, end: string): Observable<{ available: boolean; message?: string }> {
    const params = new HttpParams()
      .set('vehicleId', vehicleId)
      .set('start', start)
      .set('end', end);
    return this.http.post<{ available: boolean; message?: string }>(
      `${this.base}/schedules/check-availability`, {}, { params }
    );
  }
}
