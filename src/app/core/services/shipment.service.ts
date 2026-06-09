import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Shipment, ShipmentRequest } from '../models/shipment.model';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/shipments`;

  create(req: ShipmentRequest): Observable<Shipment> {
    return this.http.post<Shipment>(`${this.base}/create`, req);
  }

  getById(id: number): Observable<Shipment> {
    return this.http.get<Shipment>(`${this.base}/${id}`);
  }

  myOrders(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.base}/my-orders`);
  }

  getAll(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.base}/all`);
  }

  regenerateOtp(id: number): Observable<{ shipmentId: number; deliveryOtp: string }> {
    return this.http.post<{ shipmentId: number; deliveryOtp: string }>(`${this.base}/${id}/regenerate-otp`, {});
  }

  /* PUT /api/shipments/{id}/status — body is raw text status */
  updateStatus(id: number, status: string): Observable<void> {
    return this.http.put<void>(
      `${this.base}/${id}/status`,
      status,
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }

  /* POST /api/shipments/{id}/verify-delivery — alternate to /api/driver/complete */
  verifyDelivery(id: number, otp: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/verify-delivery`, { otp });
  }
}
