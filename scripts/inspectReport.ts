/**
 * Bir Logo Borç Takip Raporu export'unu (.xlsx) okur, adaptörden geçirir ve
 * YALNIZCA toplu veri kalitesi sayılarını basar. Gerçek cari/tutar satırı
 * çıktıya dökülmez — export'un kendisi de sürüm kontrolüne girmez (.gitignore).
 *
 * Kullanım: npm run inspect:report -- /yol/borc-takip.xlsx [asOf=YYYY-MM-DD]
 */
import ExcelJS from 'exceljs';
import { adaptBorcTakip } from '../src/adapters/logo/borcTakip';
import { rowsFromMatrix } from '../src/adapters/logo/fromMatrix';
import { assessQuality, type CountAmount } from '../src/quality/assess';

async function main(): Promise<void> {
  const path = process.argv[2];
  const asOf = process.argv[3] ?? new Date().toISOString().slice(0, 10);
  if (!path) {
    console.error('Kullanım: npm run inspect:report -- <borc-takip.xlsx> [asOf=YYYY-MM-DD]');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Çalışma sayfası bulunamadı');

  const matrix: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cell.value instanceof Date ? cell.value : (cell.text ?? cell.value);
    });
    matrix.push(cells);
  });

  const rows = rowsFromMatrix(matrix);
  const result = adaptBorcTakip(rows);
  const q = assessQuality(result, asOf);

  const tl = (n: number): string => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const line = (label: string, ca: CountAmount): string =>
    `  ${label.padEnd(30)} ${String(ca.count).padStart(7)} kalem   ${tl(ca.amount).padStart(18)} TL`;

  console.log(`\nOkunan satır: ${rows.length}   (asOf ${asOf})`);
  console.log('\n=== AÇIK KALEMLER ===');
  console.log(line('Toplam', q.openItems.total));
  console.log(line('Giriş (tahsilat beklenen)', q.openItems.byDirection.in));
  console.log(line('Çıkış (ödenecek)', q.openItems.byDirection.out));

  console.log('\n=== VADE KALİTESİ ===');
  console.log(line('Güvenilir', q.dueDate.reliable));
  console.log(line('Şüpheli (vade=fatura tarihi)', q.dueDate.suspect));
  console.log(line('Eksik (vade yok)', q.dueDate.missing));
  console.log(line('Belge no bozuk', q.suspectDocNo));

  console.log('\n=== 13 HAFTALIK UFUK ===');
  console.log(line('Vadesi geçmiş', q.horizon.overdue));
  console.log(line('Ufuk içi (0-13 hafta)', q.horizon.within13Weeks));
  console.log(line('Ufuk dışı (>13 hafta)', q.horizon.beyondHorizon));
  console.log(line('Vadesiz', q.horizon.missingDue));

  console.log('\n=== AÇIK KALEM SAYILMAYANLAR (gerekçe) ===');
  for (const [reason, ca] of Object.entries(q.excludedByReason)) {
    console.log(line(reason, ca));
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
