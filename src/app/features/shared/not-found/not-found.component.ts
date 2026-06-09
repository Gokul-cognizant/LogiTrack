import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px; background: var(--bg);">
    <div style="text-align:center;">
      <div style="font-size:88px; font-weight:800; color: var(--primary); letter-spacing: -0.04em;">404</div>
      <h2 style="margin:0 0 10px;">Page not found</h2>
      <p style="color: var(--text-muted); margin-bottom: 24px;">The page you're looking for doesn't exist or has been moved.</p>
      <a class="btn btn-primary" routerLink="/dashboard">Go to dashboard</a>
    </div>
  </div>
  `
})
export class NotFoundComponent {}
