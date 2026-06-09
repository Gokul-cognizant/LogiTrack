import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Notifications</h1>
        <p class="page-subtitle">{{ count() }} unread</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    <div class="card">
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && notifications().length === 0) {
        <div class="empty-state">
          <h4>You're all caught up</h4><p>No notifications yet.</p>
        </div>
      }
  
      @if (!loading() && notifications().length > 0) {
        <div class="notif-list">
          @for (n of notifications(); track n) {
            <div class="notif" [class.unread]="n.status === 'UNREAD'">
              <div class="notif-body">
                <div class="notif-header">
                  <span class="badge" [ngClass]="n.status === 'UNREAD' ? 'badge-warning' : 'badge-default'">{{ n.category }}</span>
                  <span class="notif-time">{{ n.createdAt | date:'medium' }}</span>
                </div>
                <div class="notif-msg">{{ n.message }}</div>
              </div>
              @if (n.status === 'UNREAD') {
                <button class="btn btn-secondary btn-sm" (click)="markRead(n.notificationId)">Mark read</button>
              }
            </div>
          }
        </div>
      }
    </div>
  </div>
  `,
  styles: [`
    .notif-list { display: flex; flex-direction: column; gap: 1px; }
    .notif { display: flex; gap: 12px; align-items: flex-start; padding: 14px 4px; border-bottom: 1px solid var(--border); }
    .notif:last-child { border-bottom: 0; }
    .notif.unread { background: #f8fafc; padding-left: 12px; padding-right: 12px; border-radius: 4px; }
    .notif-body { flex: 1; }
    .notif-header { display: flex; gap: 12px; align-items: center; margin-bottom: 6px; }
    .notif-time { font-size: 12px; color: var(--text-muted); }
    .notif-msg { font-size: 14px; }
  `]
})
export class NotificationsComponent implements OnInit {
  private svc = inject(NotificationService);
  loading = signal(true);
  error = signal<string | null>(null);
  notifications = signal<Notification[]>([]);
  count = signal(0);

  ngOnInit() {
    this.svc.my().subscribe({
      next: r => { this.notifications.set(r); this.count.set(r.filter(n => n.status === 'UNREAD').length); this.loading.set(false); },
      error: e => { this.error.set(e.error?.message || 'Failed.'); this.loading.set(false); }
    });
  }

  markRead(id: number) {
    this.svc.markRead(id).subscribe({
      next: () => {
        const list = this.notifications().map(n => n.notificationId === id ? { ...n, status: 'READ' as const } : n);
        this.notifications.set(list);
        this.count.set(list.filter(n => n.status === 'UNREAD').length);
      },
      error: e => this.error.set(e.error?.message || 'Failed.')
    });
  }
}
