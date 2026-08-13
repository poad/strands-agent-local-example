import { InterruptPayload } from '../types/index.js';
import { useRef, useState, useEffect } from 'react';

export function InterruptModal({
  interrupt,
  onSubmit,
  onCancel,
}: {
  interrupt: InterruptPayload;
  onSubmit: (response: string) => void;
  onCancel: () => void;
}) {
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(response);
  };

  // Auto-focus the input when modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 600 }}>
          {interrupt.name || '確認が必要です'}
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#666', whiteSpace: 'pre-wrap' }}>
          {typeof interrupt.reason === 'string' ? interrupt.reason : JSON.stringify(interrupt.reason, null, 2)}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            placeholder="回答を入力してください..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onCancel}>キャンセル</button>
            <button onClick={handleSubmit} disabled={!response.trim()}>送信</button>
          </div>
        </form>
      </div>
    </div>
  );
}
