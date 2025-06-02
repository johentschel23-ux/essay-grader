import React from 'react';
import './AssessmentSection.css';

// NOTE: currentAssessment is always the latest revision object for the current criterion.
const AssessmentSection = ({
  assessmentType,
  currentAssessment,
  editingJustification,
  editedJustification,
  editedBullets,
  setEditedJustification,
  setEditedBullets,
  setEditingJustification,
  hoveredAssessmentIndexes,
  setHoveredAssessmentIndexes,
  handleSaveJustification
}) => {
  return (
    <div className="assessment-section">
      <div className="assessment-header-row">
        <span className="assessment-label">Assessment</span>
        <span className="edit-revises-score-tag" title="Editing this assessment will trigger a revised AI score.">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{verticalAlign: 'middle', marginRight: 3}} xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="9" stroke="#fbc02d" strokeWidth="2" fill="#fffde7"/>
            <rect x="9" y="5" width="2" height="7" rx="1" fill="#fbc02d"/>
            <rect x="9" y="14" width="2" height="2" rx="1" fill="#fbc02d"/>
          </svg>
          Editing will update AI score
        </span>
        <button
          className="edit-justification-icon-btn"
          onClick={() => {
            // Always use the latest revision's justification for editing
            if (assessmentType === 'bullets' && Array.isArray(currentAssessment.justification)) {
              setEditedBullets(Array.isArray(currentAssessment.justification) ? [...currentAssessment.justification] : []);
              setEditedJustification('');
            } else {
              setEditedJustification(
                typeof currentAssessment.revisedAssessmentText === 'string' && currentAssessment.revisedAssessmentText.trim() !== ''
                  ? currentAssessment.revisedAssessmentText
                  : (currentAssessment.justification || '')
              );
              setEditedBullets([]);
            }
            setEditingJustification(true);
          }}
          aria-label="Edit assessment justification"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V14.7083L13.0833 4.625C13.4167 4.29167 13.8333 4.125 14.3333 4.125C14.8333 4.125 15.25 4.29167 15.5833 4.625L16.375 5.41667C16.7083 5.75 16.875 6.16667 16.875 6.66667C16.875 7.16667 16.7083 7.58333 16.375 7.91667L6.29167 18H3.75C3.33333 18 3 17.6667 3 17.25Z" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {editingJustification ? (
        <div className="edit-justification-container modern-card fade-in">
         
          <div className="edit-justification-label prominent-label">Edit Justification</div>
          {assessmentType === 'bullets' ? (
            <>
              {editedBullets.map((bullet, idx) => (
                <div key={idx} className="edit-bullet-row modern-bullet-row">
                  <textarea
                    className="edit-bullet-textarea modern-bullet-textarea"
                    value={bullet}
                    maxLength={350}
                    onChange={e => {
                      const newBullets = [...editedBullets];
                      newBullets[idx] = e.target.value;
                      setEditedBullets(newBullets);
                    }}
                    rows={2}
                  />
                  <span className="char-counter">{bullet.length}/350</span>
                  <button
                    className="remove-bullet-button modern-remove-btn"
                    onClick={() => {
                      setEditedBullets(editedBullets.filter((_, i) => i !== idx));
                    }}
                    aria-label="Remove bullet"
                    type="button"
                  >
                    &minus;
                  </button>
                </div>
              ))}
              <button
                className="add-bullet-button modern-add-btn"
                onClick={() => setEditedBullets([...editedBullets, ''])}
                type="button"
              >
                + Add Bullet
              </button>
            </>
          ) : (
            <div className="textarea-with-counter">
              {/* Toolbar placeholder for future formatting buttons */}
              {/* <div className="justification-toolbar">
                <button type="button" title="Bold"><b>B</b></button>
                <button type="button" title="Italic"><i>I</i></button>
                <button type="button" title="Bullets">•</button>
              </div> */}
              <textarea
                className="edit-justification-textarea large modern-textarea"
                style={{fontFamily: 'Segoe UI, Roboto, system-ui, Arial, sans-serif', fontSize: '1.12em', lineHeight: 1.7}}
                value={editedJustification}
                maxLength={1000}
                onChange={e => setEditedJustification(e.target.value)}
                placeholder="Write your assessment justification here... (Markdown supported)"
                rows={8}
              />
            </div>
          )}
          <div className="edit-justification-actions sticky-actions">
            <button className="save-justification-button modern-save-btn" onClick={handleSaveJustification} title="Saving will update the AI score based on your changes">
              <span role="img" aria-label="save" style={{marginRight: 8}}>💾</span>Save & Recalculate AI Score
            </button>
            <button className="cancel-justification-button modern-cancel-btn" onClick={() => setEditingJustification(false)}>
              <span role="img" aria-label="cancel" style={{marginRight: 6}}>✖️</span>Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {currentAssessment.revisedAssessmentText ? (
            <p className="justification">{
              typeof currentAssessment.revisedAssessmentText === 'string'
                ? (currentAssessment.revisedAssessmentText.match(/[^.!?]+[.!?]+/g) || [currentAssessment.revisedAssessmentText]).map((sentence, idx) => (
                    <span
                      key={idx}
                      className={hoveredAssessmentIndexes && hoveredAssessmentIndexes.includes(idx) ? 'assessment-highlight' : ''}
                      onMouseEnter={() => setHoveredAssessmentIndexes([idx])}
                      onMouseLeave={() => setHoveredAssessmentIndexes([])}
                    >
                      {sentence + ' '}
                    </span>
                  ))
                : currentAssessment.revisedAssessmentText
            }</p>
          ) : (
            assessmentType === 'bullets' && Array.isArray(currentAssessment.justification) ? (
              <ul className="justification-list">
                {currentAssessment.justification.map((item, idx) => {
                  const isHovered = hoveredAssessmentIndexes && hoveredAssessmentIndexes.includes(idx);
                  return (
                    <li
                      key={idx}
                      className={isHovered ? 'assessment-highlight' : ''}
                      onMouseEnter={() => setHoveredAssessmentIndexes([idx])}
                      onMouseLeave={() => setHoveredAssessmentIndexes([])}
                    >
                      {item}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="justification">{
                typeof currentAssessment.justification === 'string'
                  ? (currentAssessment.justification.match(/[^.!?]+[.!?]+/g) || [currentAssessment.justification]).map((sentence, idx) => (
                      <span
                        key={idx}
                        className={hoveredAssessmentIndexes && hoveredAssessmentIndexes.includes(idx) ? 'assessment-highlight' : ''}
                        onMouseEnter={() => setHoveredAssessmentIndexes([idx])}
                        onMouseLeave={() => setHoveredAssessmentIndexes([])}
                      >
                        {sentence + ' '}
                      </span>
                    ))
                  : currentAssessment.justification
              }</p>
            )
          )}
        </>
      )}
    </div>
  );
};

export default AssessmentSection;
