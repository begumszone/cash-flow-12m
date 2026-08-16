import { useRef, useState } from 'react';

interface Props {
  onFile: (buffer: ArrayBuffer, fileName: string) => void;
  busy: boolean;
  error: string | null;
}

/** Borç Takip .xlsx için sürükle-bırak / seç alanı. Dosya tarayıcıda okunur. */
export function FileDrop({ onFile, busy, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    const buf = await file.arrayBuffer();
    onFile(buf, file.name);
  }

  return (
    <div
      className={`drop ${dragging ? 'drop--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handle(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <div className="drop__icon">📄</div>
      <p className="drop__title">
        {busy ? 'Okunuyor…' : 'Borç Takip Raporu (.xlsx) dosyasını buraya bırakın'}
      </p>
      <p className="drop__hint">ya da tıklayıp seçin — dosya tarayıcınızdan çıkmaz</p>
      {error && <p className="drop__error">{error}</p>}
    </div>
  );
}
