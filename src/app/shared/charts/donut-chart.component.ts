import { AfterViewInit, Component, Input, OnDestroy, computed, signal } from '@angular/core';


export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [],
  template: `
  <div class="donut-wrap">
    <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [attr.width]="size" [attr.height]="size" role="img">
      <g [attr.transform]="'translate(' + (size/2) + ',' + (size/2) + ')'">
        @if (total() > 0) {
          <ng-container>
            @for (arc of animatedArcs(); track  arc) {
              <path
                [attr.d]="arc.path" [attr.fill]="arc.color">
                <title>{{ arc.label }}: {{ arc.value }}</title>
              </path>
            }
          </ng-container>
        } @else {
          <ng-template [ngTemplateOutlet]="emptyRing"></ng-template>
        }
        <ng-template #emptyRing>
          <circle [attr.r]="outerR" fill="#eef2f7"></circle>
          <circle [attr.r]="innerR" fill="#fff"></circle>
        </ng-template>
        <text text-anchor="middle" dy="-2" class="donut-num">{{ displayTotal() }}</text>
        <text text-anchor="middle" dy="16" class="donut-cap">{{ caption }}</text>
      </g>
    </svg>
    @if (showLegend) {
      <ul class="donut-legend">
        @for (s of slicesSig(); track s) {
          <li>
            <span class="sw" [style.background]="s.color"></span>
            <span class="lb">{{ s.label }}</span>
            <span class="vl">{{ s.value }}</span>
          </li>
        }
      </ul>
    }
  </div>
  `,
  styles: [`
    :host { display: block; }
    .donut-wrap { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
    .donut-num { font-size: 22px; font-weight: 700; fill: #0f172a; }
    .donut-cap { font-size: 11px; fill: #64748b; letter-spacing: .04em; text-transform: uppercase; }
    .donut-legend { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
    .donut-legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; }
    .donut-legend .sw { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
    .donut-legend .lb { flex: 1; }
    .donut-legend .vl { font-weight: 600; color: #0f172a; }
  `]
})
export class DonutChartComponent implements AfterViewInit, OnDestroy {
  /* Signal-backed input — keeps every computed reactive to new data. */
  slicesSig = signal<DonutSlice[]>([]);
  @Input() set slices(v: DonutSlice[]) {
    this.slicesSig.set(v || []);
    this.runAnim();
  }
  get slices(): DonutSlice[] { return this.slicesSig(); }

  @Input() size = 160;
  @Input() thickness = 28;
  @Input() caption = '';
  @Input() showLegend = true;

  private progress = signal(0);
  private rafId?: number;
  private startTs = 0;
  private readonly DURATION = 700;

  get outerR() { return this.size / 2 - 4; }
  get innerR() { return this.outerR - this.thickness; }

  total = computed(() => this.slicesSig().reduce((a, b) => a + (b.value || 0), 0));
  displayTotal = computed(() => Math.round(this.total() * this.progress()));

  animatedArcs = computed(() => {
    const slices = this.slicesSig();
    const t = this.total();
    const p = this.progress();
    if (t <= 0 || p <= 0) return [];
    let start = -Math.PI / 2;
    const sweep = Math.PI * 2 * p;
    const end = start + sweep;
    const arcs: { label: string; value: number; color: string; path: string }[] = [];
    for (const s of slices.filter(x => x.value > 0)) {
      const angle = (s.value / t) * Math.PI * 2;
      const sliceEnd = Math.min(start + angle, end);
      if (sliceEnd <= start) break;
      arcs.push({
        label: s.label, value: s.value, color: s.color,
        path: this.donutPath(this.outerR, this.innerR, start, sliceEnd)
      });
      start = sliceEnd;
      if (start >= end) break;
    }
    return arcs;
  });

  ngAfterViewInit() { this.runAnim(); }

  ngOnDestroy() {
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
  }

  private runAnim() {
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
    this.progress.set(0);
    this.startTs = 0;
    const step = (ts: number) => {
      if (!this.startTs) this.startTs = ts;
      const elapsed = ts - this.startTs;
      const t = Math.min(1, elapsed / this.DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      this.progress.set(eased);
      if (t < 1) this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  trackByIdx(i: number) { return i; }

  private donutPath(rOut: number, rIn: number, a0: number, a1: number): string {
    const eps = 0.00001;
    const full = Math.abs(a1 - a0) >= Math.PI * 2 - eps;
    const a1c = full ? a1 - eps : a1;
    const x0o = Math.cos(a0) * rOut, y0o = Math.sin(a0) * rOut;
    const x1o = Math.cos(a1c) * rOut, y1o = Math.sin(a1c) * rOut;
    const x0i = Math.cos(a1c) * rIn, y0i = Math.sin(a1c) * rIn;
    const x1i = Math.cos(a0) * rIn, y1i = Math.sin(a0) * rIn;
    const large = (a1c - a0) > Math.PI ? 1 : 0;
    return [
      `M ${x0o} ${y0o}`,
      `A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o}`,
      `L ${x0i} ${y0i}`,
      `A ${rIn} ${rIn} 0 ${large} 0 ${x1i} ${y1i}`,
      'Z'
    ].join(' ');
  }
}
