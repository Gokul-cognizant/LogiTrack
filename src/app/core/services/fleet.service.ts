import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InspectionRecord, InspectionRequest, MaintenanceCompleteRequest,
  MaintenanceRecord, Vehicle, VehicleRequest
} from '../models/vehicle.model';

@Injectable({ providedIn: 'root' })
export class FleetService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/fleet`;

  /* Vehicles */
  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.base}/vehicles`);
  }
  getVehicleById(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.base}/vehicles/${id}`);
  }
  addVehicle(req: VehicleRequest): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.base}/vehicles`, req);
  }
  updateVehicle(id: number, req: VehicleRequest): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.base}/vehicles/${id}`, req);
  }
  deleteVehicle(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/vehicles/${id}`);
  }

  /* Inspections */
  recordInspection(req: InspectionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/inspections`, req);
  }
  getAllInspections(): Observable<InspectionRecord[]> {
    return this.http.get<InspectionRecord[]>(`${this.base}/inspections`);
  }
  getInspectionsByVehicle(vehicleId: number): Observable<InspectionRecord[]> {
    return this.http.get<InspectionRecord[]>(`${this.base}/vehicles/${vehicleId}/inspections`);
  }

  /* Maintenance */
  getAllMaintenance(): Observable<MaintenanceRecord[]> {
    return this.http.get<MaintenanceRecord[]>(`${this.base}/maintenance`);
  }
  getMaintenanceByVehicle(vehicleId: number): Observable<MaintenanceRecord[]> {
    return this.http.get<MaintenanceRecord[]>(`${this.base}/vehicles/${vehicleId}/maintenance`);
  }
  startMaintenance(maintId: number, mechanicName: string): Observable<{ message: string }> {
    const params = new HttpParams().set('mechanicName', mechanicName);
    return this.http.patch<{ message: string }>(`${this.base}/maintenance/${maintId}/start`, {}, { params });
  }
  completeMaintenance(maintId: number, req: MaintenanceCompleteRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/maintenance/${maintId}/complete`, req);
  }
}
