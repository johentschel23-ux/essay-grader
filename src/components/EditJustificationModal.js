import React, { useState, useEffect } from 'react';
import './RubricModal.css'; // Reuse modal styles for consistency
import { IconSparkles } from './icons';

const EditJustificationModal = ({
  open,
  onClose,
  onSave,
  initialValue = '',
  warningText = 'Editing will update AI score',
  isBullets = false,
  initialBullets = [],
}) => {
  const [justification, setJustification] = useState(initialValue);
  const [bullets, setBullets] = useState(initialBullets);

  useEffect(() => {
    setJustification(initialValue);
    setBullets(initialBullets);
  }, [initialValue, initialBullets, open]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="rubric-modal" style={{minWidth: 520, maxWidth: 820}}>
        <div className="rubric-modal-header">
          <h3>Edit Justification</h3>
          <button 
            className="close-modal-button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="rubric-modal-content">
          <div className="modern-warning" style={{marginBottom: 16}}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{verticalAlign: 'middle', marginRight: 6}} xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="#fbc02d" strokeWidth="2" fill="#fffde7"/>
              <rect x="9" y="5" width="2" height="7" rx="1" fill="#fbc02d"/>
              <rect x="9" y="14" width="2" height="2" rx="1" fill="#fbc02d"/>
            </svg>
            {warningText}
          </div>
          {isBullets ? (
            <>
              {bullets.map((bullet, idx) => (
                <div key={idx} className="edit-bullet-row modern-bullet-row">
                  <textarea
                    className="edit-bullet-textarea modern-bullet-textarea"
                    value={bullet}
                    maxLength={350}
                    onChange={e => {
                      const newBullets = [...bullets];
                      newBullets[idx] = e.target.value;
                      setBullets(newBullets);
                    }}
                    rows={2}
                  />
                  <span className="char-counter">{bullet.length}/350</span>
                  <button
                    className="remove-bullet-button modern-remove-btn"
                    onClick={() => setBullets(bullets.filter((_, i) => i !== idx))}
                    aria-label="Remove bullet"
                    type="button"
                  >
                    &minus;
                  </button>
                </div>
              ))}
              <button
                className="add-bullet-button"
                type="button"
                onClick={() => setBullets([...bullets, ''])}
                style={{marginBottom: 16}}
              >+ Add bullet</button>
            </>
          ) : (
            <textarea
              className="edit-justification-textarea large modern-textarea"
              style={{fontFamily: 'Segoe UI, Roboto, system-ui, Arial, sans-serif', fontSize: '1.12em', lineHeight: 1.7}}
              value={justification}
              maxLength={1000}
              onChange={e => setJustification(e.target.value)}
              placeholder="Write your assessment justification here... (Markdown supported)"
              rows={8}
            />
          )}
          <div className="rubric-modal-actions" style={{marginTop: 18}}>
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-button" onClick={() => {
              if (isBullets) {
                onSave(bullets);
              } else {
                onSave(justification);
              }
            }}>
              <IconSparkles size={18} style={{marginRight: 8, verticalAlign: 'middle'}} />
              Save & Recalculate AI Score
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditJustificationModal;
