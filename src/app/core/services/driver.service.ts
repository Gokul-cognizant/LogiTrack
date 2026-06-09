import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DeliveryCompletionRequest, DeliveryRecord, DriverRide } from '../models/driver.model';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/driver`;

  myRides(): Observable<DriverRide[]> {
    return this.http.get<DriverRide[]>(`${this.base}/my-rides`);
  }

  startTrip(scheduleId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/trips/${scheduleId}/start`, {});
  }

  completeDelivery(shipmentId: number, req: DeliveryCompletionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/shipments/${shipmentId}/complete`, req);
  }

  getRecords(orderId: number): Observable<DeliveryRecord[]> {
    return this.http.get<DeliveryRecord[]>(`${this.base}/records/${orderId}`);
  }
}
