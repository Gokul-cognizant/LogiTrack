import { Component, OnInit, inject, signal } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-pending-users',
  standalone: true,
  imports: [],
  templateUrl: './pending-users.component.html',
  styleUrls: ['./pending-users.component.css']
})
export class PendingUsersComponent implements OnInit {
  private svc = inject(AdminService);

  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  users = signal<User[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getPending().subscribe({
      next: r => { this.users.set(r); this.loading.set(false); },
      error: e => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  approve(id: number) {
    this.svc.approve(id).subscribe({
      next: r => { this.message.set(r.message); this.load(); },
      error: e => this.error.set(this.msg(e))
    });
  }

  reject(id: number) {
    if (!confirm('Reject this registration?')) return;
    this.svc.reject(id).subscribe({
      next: r => { this.message.set(r.message); this.load(); },
      error: e => this.error.set(this.msg(e))
    });
  }

  private msg(e: HttpErrorResponse) {
    return e.error?.message || e.error?.error || e.message || 'Failed';
  }
}