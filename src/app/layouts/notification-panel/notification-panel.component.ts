import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="np-backdrop" (click)="close.emit()"></div>
  <aside class="np" role="dialog" aria-label="Notifications">
    <header class="np-head">
      <div>
        <div class="np-title">Notifications</div>
        <div class="np-sub">{{ unreadCount() }} unread of {{ items().length }}</div>
      </div>
      <div class="np-actions">
        @if (unreadCount() > 0) {
          <button class="np-link" (click)="markAll()">Mark all read</button>
        }
        <button class="np-x" (click)="close.emit()" aria-label="Close">×</button>
      </div>
    </header>
  
    <div class="np-body">
      @if (loading()) {
        <div class="np-loading"><span class="spinner"></span></div>
      }
  
      @if (!loading() && items().length === 0) {
        <div class="np-empty">
          <div class="np-empty-icon">✓</div>
          <div class="np-empty-title">You're all caught up</div>
          <div class="np-empty-sub">No notifications right now.</div>
        </div>
      }
  
      @if (!loading() && items().length > 0) {
        <ul class="np-list">
          @for (n of items(); track n) {
            <li [class.unread]="n.status === 'UNREAD'">
              <div class="np-row">
                <span class="np-dot" [class.unread]="n.status === 'UNREAD'"></span>
                <div class="np-content">
                  <div class="np-meta">
                    <span class="np-cat">{{ n.category }}</span>
                    <span class="np-time">{{ n.createdAt | date:'short' }}</span>
                  </div>
                  <div class="np-msg">{{ n.message }}</div>
                  <div class="np-tools">
                    @if (n.status === 'UNREAD') {
                      <button class="np-link" (click)="markRead(n.notificationId)">Mark read</button>
                    }
                    <button class="np-link np-link-mute" (click)="dismiss(n.notificationId)">Dismiss</button>
                  </div>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  
    <footer class="np-foot">
      <a routerLink="/notifications" (click)="close.emit()" class="np-foot-link">View all notifications →</a>
    </footer>
  </aside>
  `,
  styles: [`
    :host { display: contents; }
    .np-backdrop {
      position: fixed; inset: 0; background: rgba(15,23,42,0.35);
      z-index: 998; animation: fade .15s ease;
    }
    .np {
      position: fixed; right: 0; top: 0; bottom: 0; width: 380px; max-width: 92vw;
      background: #fff; box-shadow: -8px 0 32px rgba(15,23,42,.18);
      z-index: 999; display: flex; flex-direction: column;
      animation: slide .2s ease;
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .np-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 18px 18px 14px; border-bottom: 1px solid #e2e8f0;
    }
    .np-title { font-size: 16px; font-weight: 700; color: #0f172a; }
    .np-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .np-actions { display: flex; align-items: center; gap: 8px; }
    .np-x { background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: #64748b; padding: 0 4px; }
    .np-x:hover { color: #0f172a; }
    .np-link {
      background: none; border: none; color: #4f46e5;
      font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 0;
    }
    .np-link:hover { text-decoration: underline; }
    .np-link-mute { color: #94a3b8; }
    .np-body { flex: 1; overflow-y: auto; padding: 4px 0; }
    .np-loading { display: flex; justify-content: center; padding: 28px; }
    .spinner { width: 18px; height: 18px; border: 2px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .np-empty { padding: 36px 20px; text-align: center; color: #64748b; }
    .np-empty-icon {
      width: 44px; height: 44px; border-radius: 50%; margin: 0 auto 10px;
      display: flex; align-items: center; justify-content: center;
      background: #d1fae5; color: #059669; font-size: 22px;
    }
    .np-empty-title { font-weight: 600; color: #0f172a; }
    .np-empty-sub { font-size: 13px; margin-top: 4px; }
    .np-list { list-style: none; margin: 0; padding: 0; }
    .np-list li { border-bottom: 1px solid #f1f5f9; }
    .np-list li.unread { background: #f8fafc; }
    .np-row { display: flex; gap: 10px; padding: 12px 16px; }
    .np-dot { width: 8px; height: 8px; border-radius: 50%; background: transparent; margin-top: 7px; flex-shrink: 0; }
    .np-dot.unread { background: #4f46e5; }
    .np-content { flex: 1; min-width: 0; }
    .np-meta { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 4px; }
    .np-cat {
      font-size: 10px; font-weight: 700; letter-spacing: .04em;
      text-transform: uppercase; color: #475569;
      background: #e2e8f0; padding: 2px 6px; border-radius: 4px;
    }
    .np-time { font-size: 11px; color: #94a3b8; }
    .np-msg { font-size: 13.5px; color: #0f172a; line-height: 1.4; }
    .np-tools { display: flex; gap: 12px; margin-top: 6px; }
    .np-foot { padding: 12px 16px; border-top: 1px solid #e2e8f0; text-align: center; }
    .np-foot-link {
      color: #4f46e5; font-size: 13px; font-weight: 600; text-decoration: none;
    }
    .np-foot-link:hover { text-decoration: underline; }
  `]
})
export class NotificationPanelComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private svc = inject(NotificationService);
  loading = signal(true);
  items = signal<Notification[]>([]);
  unreadCount = signal(0);

  ngOnInit() { this.refresh(); }

  refresh() {
    this.loading.set(true);
    this.svc.my().subscribe({
      next: list => {
        this.items.set(list);
        this.unreadCount.set(list.filter(n => n.status === 'UNREAD').length);
        this.loading.set(false);
      },
      error: () => { this.items.set([]); this.unreadCount.set(0); this.loading.set(false); }
    });
  }

  markRead(id: number) {
    this.svc.markRead(id).subscribe();
    this.items.set(this.svc.notifications());
    this.unreadCount.set(this.svc.unread());
  }
  markAll() {
    this.svc.markAllRead();
    this.items.set(this.svc.notifications());
    this.unreadCount.set(0);
  }
  dismiss(id: number) {
    this.svc.dismiss(id);
    this.items.set(this.svc.notifications());
    this.unreadCount.set(this.svc.unread());
  }
}
