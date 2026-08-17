/**
 * Dosyayı ortamdan bağımsız kaydeder:
 *  - Yayınlanan artifact içinde: claude.use("downloads") ile (sandbox doğrudan
 *    indirmeyi engeller, yetenek üzerinden onaylı kayıt yapılır).
 *  - Normal tarayıcıda (npm run dev / statik host): blob indirme.
 *
 * Sonuç `via` ile hangi yolun kullanıldığını, hata olursa `error` kodunu döner.
 */
export interface SaveOutcome {
  ok: boolean;
  via: 'capability' | 'blob';
  error?: string;
}

interface ClaudeGlobal {
  use?: (name: string) => Promise<{ save: (r: { filename: string; data: string }) => Promise<unknown> } | null>;
}

export async function saveTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): Promise<SaveOutcome> {
  const claude = (globalThis as unknown as { claude?: ClaudeGlobal }).claude;
  if (claude && typeof claude.use === 'function') {
    try {
      const downloads = await claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: content });
        return { ok: true, via: 'capability' };
      }
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'unavailable';
      return { ok: false, via: 'capability', error: code };
    }
  }

  // Normal tarayıcı: blob indirme.
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true, via: 'blob' };
}
