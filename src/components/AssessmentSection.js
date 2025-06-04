import React, { useState } from 'react';
import './AssessmentSection.css';
import EditJustificationModal from './EditJustificationModal';

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
  const [modalOpen, setModalOpen] = useState(false);

  // Helper to get the latest justification/bullets from the assessment object
  function getLatestJustification() {
    return typeof currentAssessment.revisedAssessmentText === 'string' && currentAssessment.revisedAssessmentText.trim() !== ''
      ? currentAssessment.revisedAssessmentText
      : (currentAssessment.justification || '');
  }
  function getLatestBullets() {
    return Array.isArray(currentAssessment.justification) ? [...currentAssessment.justification] : [];
  }

  // Open modal, always use latest assessment values
  function openModal() {
    setModalOpen(true);
  }

  // On save, update parent, then close modal
  function handleModalSave(val) {
    if (assessmentType === 'bullets') {
      setEditedBullets(val);
      setEditedJustification('');
    } else {
      setEditedJustification(val);
      setEditedBullets([]);
    }
    setModalOpen(false);
    // Do NOT call handleSaveJustification directly. Instead, set flag for useEffect in InteractiveGrading.js
    if (typeof setEditingJustification === 'function') {
      setEditingJustification('pending-save');
    }
  }

  // On modal close (cancel)
  function handleModalClose() {
    setModalOpen(false);
  }

  return (
    <div className="assessment-section">
      <EditJustificationModal
        open={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        initialValue={getLatestJustification()}
        isBullets={assessmentType === 'bullets'}
        initialBullets={getLatestBullets()}
        warningText="Editing will update AI score"
      />
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
          onClick={openModal}
          aria-label="Edit assessment justification"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V14.7083L13.0833 4.625C13.4167 4.29167 13.8333 4.125 14.3333 4.125C14.8333 4.125 15.25 4.29167 15.5833 4.625L16.375 5.41667C16.7083 5.75 16.875 6.16667 16.875 6.66667C16.875 7.16667 16.7083 7.58333 16.375 7.91667L6.29167 18H3.75C3.33333 18 3 17.6667 3 17.25Z" stroke="#616161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
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
    </div>
  );
};

export default AssessmentSection;
