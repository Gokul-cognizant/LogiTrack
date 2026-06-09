import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLog } from '../../../core/models/user.model';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.css']
})
export class AuditLogsComponent implements OnInit {
  private svc = inject(AdminService);

  loading = signal(true);
  error = signal<string | null>(null);
  logs = signal<AuditLog[]>([]);

  ngOnInit() {
    this.svc.auditLogs().subscribe({
      next: r => { this.logs.set(r); this.loading.set(false); },
      error: e => { this.error.set(e.error?.message || 'Failed.'); this.loading.set(false); }
    });
  }
}