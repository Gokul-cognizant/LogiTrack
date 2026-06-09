import { AfterViewInit, Component, Input, computed, signal } from '@angular/core';


export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [],
  template: `
  <div class="bar-wrap">
    @for (b of bars(); track trackByLbl($index, b)) {
      <div class="bar-row">
        <div class="bar-label" [title]="b.label">{{ b.label }}</div>
        <div class="bar-track">
          <div class="bar-fill"
            [style.width.%]="animate() ? b.pct : 0"
          [style.background]="b.color || defaultColor"></div>
        </div>
        <div class="bar-val">{{ b.value }}</div>
      </div>
    }
    @if (itemsSig().length === 0) {
      <div class="bar-empty">No data.</div>
    }
  </div>
  `,
  styles: [`
    :host { display: block; }
    .bar-wrap { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 140px 1fr 48px; gap: 12px; align-items: center; }
    .bar-label { font-size: 13px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { background: #f1f5f9; height: 14px; border-radius: 999px; overflow: hidden; position: relative; }
    .bar-fill { height: 100%; border-radius: 999px; transition: width .6s cubic-bezier(.22,.61,.36,1); min-width: 0; }
    .bar-val { font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; }
    .bar-empty { font-size: 13px; color: #94a3b8; padding: 12px 0; }
  `]
})
export class BarChartComponent implements AfterViewInit {
  itemsSig = signal<BarItem[]>([]);
  @Input() set items(v: BarItem[]) {
    this.itemsSig.set(v || []);
    this.animate.set(false);
    requestAnimationFrame(() => this.animate.set(true));
  }
  get items(): BarItem[] { return this.itemsSig(); }

  @Input() defaultColor = '#4f46e5';

  animate = signal(false);

  bars = computed(() => {
    const list = this.itemsSig();
    const max = Math.max(1, ...list.map(i => i.value));
    return list.map(i => ({ ...i, pct: Math.round((i.value / max) * 100) }));
  });

  ngAfterViewInit() {
    requestAnimationFrame(() => this.animate.set(true));
  }

  trackByLbl(_: number, b: BarItem) { return b.label; }
}
