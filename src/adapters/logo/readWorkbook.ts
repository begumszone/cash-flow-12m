import ExcelJS from 'exceljs';
import type { BorcTakipRow } from './borcTakip';
import type { CekSenetRow } from './cekSenet';
import { rowsFromMatrix } from './fromMatrix';
import { cekSenetRowsFromMatrix } from './cekSenetFromMatrix';

/**
 * Bir .xlsx dosyasını (ArrayBuffer) ham hücre matrisine çevirir. Dosya
 * tarayıcıdan HİÇ çıkmaz — ExcelJS tümüyle istemci tarafında çalışır.
 */
async function readMatrix(buffer: ArrayBuffer): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Çalışma sayfası bulunamadı');

  const matrix: unknown[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cell.value instanceof Date ? cell.value : cell.text || cell.value;
    });
    matrix.push(cells);
  });
  return matrix;
}

export async function readBorcTakipWorkbook(buffer: ArrayBuffer): Promise<BorcTakipRow[]> {
  return rowsFromMatrix(await readMatrix(buffer));
}

export async function readCekSenetWorkbook(buffer: ArrayBuffer): Promise<CekSenetRow[]> {
  return cekSenetRowsFromMatrix(await readMatrix(buffer));
}
