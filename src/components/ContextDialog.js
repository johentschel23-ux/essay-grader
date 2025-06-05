import React, { useState, useRef } from 'react';
import './ContextDialog.css';
import pdfUtils from '../utils/pdfUtils';

const MAX_CONTEXT_LENGTH = 20000;

const ContextDialog = ({ open, onClose, contextList, setContextList }) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  const handlePdfUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setLoadingPdf(true);
    setError('');
    try {
      const extractedText = await pdfUtils.extractTextFromPdf(file);
      setContent(extractedText);
      setTitle(file.name.replace(/\.pdf$/i, ''));
      setAdding(true);
    } catch (err) {
      setError('Failed to extract text from PDF.');
    } finally {
      setLoadingPdf(false);
      e.target.value = '';
    }
  };

  const openPdfDialog = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleAddContext = () => {
    if (!title.trim()) {
      setError('Please enter a title for your context element.');
      return;
    }
    if (!content.trim()) {
      setError('Please enter some context information.');
      return;
    }
    if (content.length > MAX_CONTEXT_LENGTH) {
      setError(`Context is too long (max ${MAX_CONTEXT_LENGTH} characters).`);
      return;
    }
    setContextList([...contextList, { title: title.trim(), content: content.trim() }]);
    setTitle('');
    setContent('');
    setError('');
    setAdding(false);
  };

  const handleRemove = idx => {
    setContextList(contextList.filter((_, i) => i !== idx));
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="context-dialog-modal">
        <div className="context-dialog-header">
          <h3>Context Dump <span role="img" aria-label="library">📚</span></h3>
          <button className="close-modal-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="context-dialog-content">
          {loadingPdf ? (
            <div className="add-context-form" style={{textAlign: 'center', padding: '2em 0'}}>
              <span style={{fontSize: 22, color: '#2563eb'}}>Extracting text from PDF…</span>
            </div>
          ) : adding ? (
            <div className="add-context-form">
              <input
                className="context-title-input"
                type="text"
                maxLength={80}
                placeholder="Title (e.g., Course Outline)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
              <textarea
                className="context-content-textarea"
                placeholder={`Paste context information here (max ${MAX_CONTEXT_LENGTH} chars)`}
                maxLength={MAX_CONTEXT_LENGTH}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
              />
              <div className="context-char-counter">
                {content.length}/{MAX_CONTEXT_LENGTH}
              </div>
              {error && <div className="context-error">{error}</div>}
              <div className="context-dialog-actions">
                <button className="save-context-btn" onClick={handleAddContext}>Add Context</button>
                <button className="cancel-context-btn" onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="context-list-section">
              <ul className="context-list">
                {contextList.map((ctx, idx) => (
                  <li key={idx} className="context-list-item" tabIndex={0} aria-label={ctx.title}>
                    <div className="context-list-title" style={{ fontWeight: 600, fontSize: '1.07em', marginBottom: 6, color: '#2563eb', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.title}</div>
                    <div
                      className="context-list-content-preview"
                      style={{
                        color: '#334155',
                        fontSize: '0.98em',
                        width: '100%',
                        whiteSpace: 'pre-line',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        maxHeight: '6.7em',
                        lineHeight: '1.34em',
                      }}
                    >
                      {ctx.content.length > 220 ? ctx.content.slice(0, 220) + '…' : ctx.content}
                    </div>
                    <button className="remove-context-btn" onClick={() => handleRemove(idx)} title="Remove" tabIndex={0} aria-label={`Remove context: ${ctx.title}`}>🗑️</button>
                  </li>
                ))}
                <li className="add-context-card" tabIndex={0} role="button" aria-label="Add context" onClick={() => setAdding(true)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAdding(true)}>
                  <span style={{ fontSize: 38, color: '#4285f4', userSelect: 'none' }}>+</span>
                </li>
                <li className="add-context-card" tabIndex={0} role="button" aria-label="Upload PDF context" onClick={openPdfDialog} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openPdfDialog()} style={{marginLeft: 8}}>
                  <span style={{ fontSize: 24, color: '#34a853', userSelect: 'none', marginRight: 8 }}>📄</span>
                  <span style={{ fontSize: 15, color: '#34a853', userSelect: 'none' }}>Upload PDF</span>
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} ref={fileInputRef} onChange={handlePdfUpload} />
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextDialog;
