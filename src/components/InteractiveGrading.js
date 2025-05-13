import React from 'react';
import './InteractiveGrading.css';

import AdvancedPdfViewer from './AdvancedPdfViewer';

const InteractiveGrading = ({
  isProcessingRubric,
  rubricCriteria,
  gradingComplete,
  renderOverallAssessment,
  criteriaAssessments,
  setCriteriaAssessments,
  currentCriterionIndex,
  showEvidence,
  setShowEvidence,
  teacherScores,
  handleTeacherScoreInput,
  showAIScores,
  revealAIScore,
  moveToNextCriterion,
  moveToPreviousCriterion,
  finishGrading,
  restartGrading,
  pdfFile,
  activePdfEvidence
}) => {
  const [editingJustification, setEditingJustification] = React.useState(false);
  const [editedJustification, setEditedJustification] = React.useState('');

  React.useEffect(() => {
    if (criteriaAssessments.length > 0 && currentCriterionIndex < criteriaAssessments.length) {
      setEditedJustification(criteriaAssessments[currentCriterionIndex].justification || '');
      setEditingJustification(false);
    }
  }, [currentCriterionIndex, criteriaAssessments]);

  const handleSaveJustification = () => {
    const updatedAssessments = criteriaAssessments.map((assessment, idx) =>
      idx === currentCriterionIndex
        ? { ...assessment, justification: editedJustification }
        : assessment
    );
    setCriteriaAssessments(updatedAssessments);
    setEditingJustification(false);
  };


  // If we're still loading criteria
  if (isProcessingRubric && rubricCriteria.length === 0) {
    return (
      <div className="loading-container">
        <p>Analyzing rubric and preparing grading interface...</p>
      </div>
    );
  }

  // If we've completed grading, show the overall assessment
  if (gradingComplete) {
    return renderOverallAssessment();
  }

  // If we have criteria but no assessments yet
  if (rubricCriteria.length > 0 && criteriaAssessments.length === 0) {
    return (
      <div className="loading-container">
        <p>Analyzing essay based on rubric criteria...</p>
      </div>
    );
  }

  // If we have assessments, show the current criterion
  if (criteriaAssessments.length > 0 && currentCriterionIndex < criteriaAssessments.length) {
    const currentAssessment = criteriaAssessments[currentCriterionIndex];
    const criterionId = currentAssessment.id;

    return (
      <div className="interactive-grading-container"> 
        <div className="grading-controls-column">
          <div className="grading-progress">
            <span>Criterion {currentCriterionIndex + 1} of {rubricCriteria.length}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentCriterionIndex + 1) / rubricCriteria.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="criterion-card">
            <h3>{currentAssessment.name}</h3>
            <div className="criterion-levels">
              {currentAssessment.levels && currentAssessment.levels.map(level => (
                <div key={level.score} className="criterion-level">
                  <span className="level-score">{level.score}</span>
                  <span className="level-description">{level.description}</span>
                </div>
              ))}
            </div>
            <div className="criterion-assessment">
              <h4>Assessment</h4>
              {editingJustification ? (
                <div className="edit-justification-container">
                  <div className="edit-justification-label">Edit Justification</div>
<textarea
  className="edit-justification-textarea large"
  value={editedJustification}
  onChange={e => setEditedJustification(e.target.value)}
  placeholder="Write your assessment justification here..."
  rows={8}
/>
<div className="edit-justification-actions">
  <button className="save-justification-button" onClick={handleSaveJustification}>Save</button>
  <button className="cancel-justification-button" onClick={() => setEditingJustification(false)}>Cancel</button>
</div>
                  <button className="save-justification-button" onClick={handleSaveJustification}>Save</button>
                  <button className="cancel-justification-button" onClick={() => setEditingJustification(false)}>Cancel</button>
                </div>
              ) : (
                <>
                  <p className="justification">{currentAssessment.justification}</p>
                  <button className="edit-justification-button" onClick={() => {
                    setEditedJustification(currentAssessment.justification || '');
                    setEditingJustification(true);
                  }}>Edit</button>
                </>
              )}
              {!showEvidence ? (
                <button 
                  className="show-evidence-button"
                  onClick={() => setShowEvidence(true)}
                >
                  Show Evidence
                </button>
              ) : (
                <div className="evidence-container">
                  <h4>Evidence from Essay</h4>
                  {currentAssessment.evidence && currentAssessment.evidence.map((item, index) => (
                    <div key={index} className="evidence-item">
                      <div className="evidence-location">
                        <span className="evidence-page">Page {item.page || 'N/A'}</span>
                      </div>
                      <blockquote className="evidence-quote">"{item.highlight || 'No quote available'}"</blockquote>
                      {item.context && <div className="evidence-context">Context: {item.context}</div>}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="evidence-keywords">
                          <small>Key terms: {item.keywords.join(', ')}</small>
                        </div>
                      )}
                    </div>
                  ))}
                  <button 
                    className="hide-evidence-button"
                    onClick={() => setShowEvidence(false)}
                  >
                    Hide Evidence
                  </button>
                </div>
              )}
            </div>
            <div className="scoring-section">
              <div className="teacher-scoring">
                <h4>Your Score</h4>
                <div className="score-input-container">
                  <select 
                    value={teacherScores[criterionId] || ''}
                    onChange={(e) => handleTeacherScoreInput(criterionId, parseInt(e.target.value))}
                    className="score-select"
                  >
                    <option value="">Select a score</option>
                    {Array.from({ length: currentAssessment.scoreRange.max - currentAssessment.scoreRange.min + 1 }, 
                      (_, i) => currentAssessment.scoreRange.min + i).map(score => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ai-scoring">
                <h4>AI Score</h4>
                {showAIScores[criterionId] ? (
                  <div className="ai-score-revealed">{currentAssessment.aiScore}</div>
                ) : (
                  <button 
                    className="reveal-score-button"
                    onClick={() => revealAIScore(criterionId)}
                    disabled={!teacherScores[criterionId]}
                  >
                    {teacherScores[criterionId] ? 'Reveal AI Score' : 'Enter your score first'}
                  </button>
                )}
              </div>
            </div>
          </div>
        <div className="grading-navigation">
          <button 
            className="prev-button"
            onClick={moveToPreviousCriterion}
            disabled={currentCriterionIndex === 0}
          >
            Previous
          </button>
          <button 
            className="next-button"
            onClick={moveToNextCriterion}
          >
            Next
          </button>
        </div>
      </div>
      {/* Right Column: PDF Viewer */}
      <div className="pdf-viewer-column">
          {pdfFile ? (
            <AdvancedPdfViewer
              url={pdfFile}
              evidence={activePdfEvidence}
            />
          ) : (
            <div className="pdf-placeholder">
              <p>Please upload a PDF to view it here.</p>
              <p>Once an essay and rubric are processed, click "Show Evidence in PDF" on a criterion to see highlights.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default InteractiveGrading;
