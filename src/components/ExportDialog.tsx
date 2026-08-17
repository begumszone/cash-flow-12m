import { useState } from 'react';
import type { ExportSections } from '../lib/exportCsv';

interface Props {
  onClose: () => void;
  onConfirm: (sections: ExportSections) => void;
  note: string | null;
}

const OPTIONS: { key: keyof ExportSections; label: string; desc: string }[] = [
  { key: 'summary', label: 'Yönetici özeti', desc: 'Açılış, dip nokta, toplamlar' },
  { key: 'weekly', label: 'Haftalık projeksiyon', desc: '13 haftanın giriş/çıkış/kapanışı' },
  { key: 'collections', label: 'Tahsilatlar', desc: 'Gelecek tahsilatlar, tek tek' },
  { key: 'payments', label: 'Ödemeler', desc: 'Yapılacak ödemeler, tek tek' },
];

/** "Neyi aktaralım?" — Excel'e hangi bölümlerin gireceğini kullanıcı seçer. */
export function ExportDialog({ onClose, onConfirm, note }: Props) {
  const [sel, setSel] = useState<ExportSections>({
    summary: true,
    weekly: true,
    collections: true,
    payments: true,
  });

  const none = !sel.summary && !sel.weekly && !sel.collections && !sel.payments;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <h2>Excel'e Aktar</h2>
          <button className="modal__close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>
        <p className="panel__lead">Hangi bölümler aktarılsın?</p>

        <div className="export-opts">
          {OPTIONS.map((o) => (
            <label key={o.key} className="export-opt">
              <input
                type="checkbox"
                checked={sel[o.key]}
                onChange={(e) => setSel((s) => ({ ...s, [o.key]: e.target.checked }))}
              />
              <span>
                <span className="export-opt__label">{o.label}</span>
                <span className="export-opt__desc">{o.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {note && <p className="panel__note panel__note--bad">{note}</p>}

        <div className="modal__foot">
          <button className="btn" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn btn--primary" disabled={none} onClick={() => onConfirm(sel)}>
            Aktar (.csv)
          </button>
        </div>
      </div>
    </div>
  );
}
