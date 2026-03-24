import { useRef, useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import clsx from 'clsx';

export default function ImageUploader({ label, hint, currentUrl, onUpload, maxKB = 500, aspect = 'wide' }) {
  const [preview,   setPreview]   = useState(currentUrl || null);
  const [dragging,  setDragging]  = useState(false);
  const [error,     setError]     = useState(null);
  const inputRef = useRef();

  const handleFile = (file) => {
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > maxKB * 1024) { setError(`Image must be under ${maxKB}KB`); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setPreview(e.target.result); // data URL for preview
      onUpload({ imageData: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = (e) => {
    e.stopPropagation();
    setPreview(null);
    onUpload({ imageData: null, mimeType: null });
  };

  const aspectClass = aspect === 'square' ? 'h-24 w-24 rounded-xl' : 'h-20 w-48 rounded-xl';

  return (
    <div>
      {label && <p className="label mb-2">{label}</p>}
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl transition-all cursor-pointer relative overflow-hidden flex items-center justify-center',
          dragging ? 'border-amber-500 bg-amber-500/5' : 'border-border hover:border-amber-500/40 hover:bg-surface/50',
          aspectClass
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain p-2" />
            <button
              className="absolute top-1 right-1 w-5 h-5 bg-danger/80 rounded-full flex items-center justify-center text-white hover:bg-danger transition-colors"
              onClick={clear}>
              <X size={11} />
            </button>
          </>
        ) : (
          <div className="text-center p-3">
            <Upload size={18} className="text-muted mx-auto mb-1" />
            <p className="text-xs text-muted">Click or drag</p>
            <p className="text-[10px] text-muted/60">Max {maxKB}KB</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
      </div>
      {hint  && <p className="text-xs text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
