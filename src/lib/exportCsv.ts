import type { ProjectionResult } from '../projection/project';
import type { Summary } from '../projection/summary';
import { categoryLabel } from '../core/category';

/** Excel'e aktarılacak bölümler — kullanıcı hangilerini istediğini seçer. */
export interface ExportSections {
  summary: boolean;
  weekly: boolean;
  collections: boolean;
  payments: boolean;
}

function esc(v: string | number): string {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function row(...cells: (string | number)[]): string {
  return cells.map(esc).join(';');
}
function money(n: number): number {
  return Math.round(n);
}
function trDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Projeksiyonu CSV'ye çevirir (Excel doğrudan açar). `;` ayraç + UTF-8 BOM,
 * Türkçe Excel'de kolonlar düzgün ayrılsın diye. Yalnızca seçilen bölümler
 * yazılır.
 */
export function buildCsv(
  projection: ProjectionResult,
  summary: Summary,
  asOf: string,
  sections: ExportSections,
): string {
  const lines: string[] = [];

  if (sections.summary) {
    lines.push(row('YÖNETİCİ ÖZETİ'));
    lines.push(row('Başlangıç tarihi', trDate(asOf)));
    lines.push(row('Açılış nakdi (kasa+banka)', money(summary.openingBalance)));
    lines.push(row('En düşük nakit noktası', money(summary.lowestClosing), summary.lowestWeekLabel));
    lines.push(row('13 hafta sonu tahmini', money(summary.endingBalance)));
    lines.push(row('Toplam tahsilat (13 hafta)', money(summary.totalIn)));
    lines.push(row('Toplam ödeme (13 hafta)', money(summary.totalOut)));
    lines.push(row('Nakit açığı olan hafta', summary.deficitWeeks));
    lines.push('');
  }

  if (sections.weekly) {
    lines.push(row('HAFTALIK PROJEKSİYON'));
    lines.push(row('Hafta', 'Başlangıç', 'Açılış', 'Giriş', 'Çıkış', 'Net', 'Kapanış'));
    for (const w of projection.weeks) {
      lines.push(
        row(w.key, trDate(w.start), money(w.opening), money(w.totalIn), money(w.totalOut), money(w.net), money(w.closing)),
      );
    }
    lines.push('');
  }

  const flowsSection = (title: string, dir: 'in' | 'out') => {
    lines.push(row(title));
    lines.push(row('Tarih', 'Cari', 'Kategori', 'Tür', 'Tutar', 'Hafta'));
    for (const f of projection.flows) {
      if (f.direction !== dir) continue;
      lines.push(
        row(trDate(f.date), f.label, categoryLabel(f.category), f.detail, money(f.amount), projection.weeks[f.weekIndex]?.key ?? ''),
      );
    }
    lines.push('');
  };

  if (sections.collections) flowsSection('TAHSİLATLAR', 'in');
  if (sections.payments) flowsSection('ÖDEMELER', 'out');

  // UTF-8 BOM + CRLF: Türkçe karakterler ve Excel uyumu için.
  return '﻿' + lines.join('\r\n');
}
