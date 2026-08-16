import ExcelJS from 'exceljs';
import type { BorcTakipRow } from './borcTakip';
import { rowsFromMatrix } from './fromMatrix';

/**
 * Tarayıcıda bir .xlsx dosyasını (ArrayBuffer) okuyup Borç Takip satırlarına
 * çevirir. Dosya tarayıcıdan HİÇ çıkmaz — ExcelJS tümüyle istemci tarafında
 * çalışır, ağ isteği yok.
 */
export async function readBorcTakipWorkbook(buffer: ArrayBuffer): Promise<BorcTakipRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Çalışma sayfası bulunamadı');

  const matrix: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: unknown[] = [];
    // exceljs 1-bazlı; 0-bazlı matrise çeviriyoruz.
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cell.value instanceof Date ? cell.value : cell.text || cell.value;
    });
    matrix.push(cells);
  });
  return rowsFromMatrix(matrix);
}
