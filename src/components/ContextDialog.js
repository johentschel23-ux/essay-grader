import React, { useState } from 'react';
import './ContextDialog.css';

const MAX_CONTEXT_LENGTH = 50000;

const ContextDialog = ({ open, onClose, contextList, setContextList, contextId }) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

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
        {contextId && (
          <div style={{ fontSize: '0.93em', color: '#2563eb', margin: '0 0 7px 2px', fontWeight: 500 }}>
            Context cache active: <span style={{ fontFamily: 'monospace', fontSize: '0.96em', color: '#0b5d8c' }}>{contextId}</span>
          </div>
        )}
        <div className="context-dialog-content">
          {adding ? (
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
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextDialog;
