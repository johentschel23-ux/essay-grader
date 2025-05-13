import React from 'react';
import './InteractiveGrading.css';

import AdvancedPdfViewer from './AdvancedPdfViewer';

const InteractiveGrading = ({
  isProcessingRubric,
  rubricCriteria,
  gradingComplete,
  renderOverallAssessment,
  overallAssessment,
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
  activePdfEvidence,
  essayContent // <-- add essayContent as a prop
}) => {
  const [editingJustification, setEditingJustification] = React.useState(false);
  const [editedJustification, setEditedJustification] = React.useState('');

  React.useEffect(() => {
    if (criteriaAssessments.length > 0 && currentCriterionIndex < criteriaAssessments.length) {
      setEditedJustification(criteriaAssessments[currentCriterionIndex].justification || '');
      setEditingJustification(false);
    }
  }, [currentCriterionIndex, criteriaAssessments]);

  const [isRevisingScore, setIsRevisingScore] = React.useState(false);
const [revisionRationale, setRevisionRationale] = React.useState('');

const handleSaveJustification = async () => {
  const now = () => new Date().toISOString();
  const currentAssessment = criteriaAssessments[currentCriterionIndex];
  console.log(`[${now()}] [handleSaveJustification] currentAssessment:`, currentAssessment);
  const wasEdited = editedJustification.trim() !== (currentAssessment.justification || '').trim();
  let updatedAssessment = { ...currentAssessment, justification: editedJustification, essayContent: essayContent };
  setEditingJustification(false);
  setRevisionRationale('');

  // Save the old score for visualization
  updatedAssessment.originalAiScore = currentAssessment.aiScore;

  if (wasEdited) {
    setIsRevisingScore(true);
    try {
      console.log(`[${now()}] [handleSaveJustification] Calling LLM for revised score...`, {
        essayContent,
        criterion: currentAssessment,
        originalJustification: currentAssessment.justification || '',
        editedJustification,
        originalScore: currentAssessment.aiScore
      });
      const { revisedScore, rationale } = await (window.geminiService
        ? window.geminiService.reviseCriterionScoreWithJustification(
            essayContent || '',
            currentAssessment,
            currentAssessment.justification || '',
            editedJustification,
            currentAssessment.aiScore
          )
        : require('../services/geminiService').reviseCriterionScoreWithJustification(
            essayContent || '',
            currentAssessment,
            currentAssessment.justification || '',
            editedJustification,
            currentAssessment.aiScore
          ));
      console.log(`[${now()}] [handleSaveJustification] LLM response:`, { revisedScore, rationale });
      updatedAssessment = {
        ...updatedAssessment,
        aiScore: revisedScore,
        revisionRationale: rationale,
        essayContent: essayContent
      };
      setRevisionRationale(rationale);
      console.log(`[${now()}] [handleSaveJustification] updatedAssessment after LLM:`, updatedAssessment);
    } catch (error) {
      setRevisionRationale('There was an error revising the score. The original score is retained.');
      console.error(`[${now()}] [handleSaveJustification] Error during LLM call:`, error);
    } finally {
      setIsRevisingScore(false);
    }
  }
  // Force a new array/object reference for React state
  const updatedAssessments = criteriaAssessments.map((assessment, idx) => {
    if (idx === currentCriterionIndex) {
      // Defensive: always ensure aiScore is a number and rationale is a string
      return {
        ...updatedAssessment,
        aiScore: typeof updatedAssessment.aiScore === 'number' ? updatedAssessment.aiScore : Number(updatedAssessment.aiScore),
        revisionRationale: typeof updatedAssessment.revisionRationale === 'string' ? updatedAssessment.revisionRationale : (updatedAssessment.revisionRationale ? String(updatedAssessment.revisionRationale) : '')
      };
    }
    // Also clone the other objects to force a new array reference
    return { ...assessment };
  });
  console.log(`[${now()}] [handleSaveJustification] updatedAssessments:`, updatedAssessments);
  setCriteriaAssessments(updatedAssessments);
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
      <div className="initial-assessment-loading">
        <div className="spinner" aria-label="Loading assessment...">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle className="spinner-bg" cx="24" cy="24" r="20" fill="none" stroke="#e0e0e0" strokeWidth="5"/>
            <circle className="spinner-fg" cx="24" cy="24" r="20" fill="none" stroke="#4cb5f5" strokeWidth="5" strokeLinecap="round" strokeDasharray="100, 40"/>
          </svg>
        </div>
        <div className="loading-message">Analyzing essay based on rubric criteria...</div>
      </div>
    );
  }

  // Show loading visual when waiting for final grading screen (overall assessment generation)
  if (
    rubricCriteria.length > 0 &&
    criteriaAssessments.length === rubricCriteria.length &&
    !overallAssessment
  ) {
    return (
      <div className="initial-assessment-loading">
        <div className="spinner" aria-label="Loading overall assessment...">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle className="spinner-bg" cx="24" cy="24" r="20" fill="none" stroke="#e0e0e0" strokeWidth="5"/>
            <circle className="spinner-fg" cx="24" cy="24" r="20" fill="none" stroke="#4cb5f5" strokeWidth="5" strokeLinecap="round" strokeDasharray="100, 40"/>
          </svg>
        </div>
        <div className="loading-message">Generating final overall assessment...</div>
      </div>
    );
  }

  // If we have assessments, show the current criterion
  if (criteriaAssessments.length > 0 && currentCriterionIndex < criteriaAssessments.length) {
    const currentAssessment = criteriaAssessments[currentCriterionIndex];
    const criterionId = currentAssessment.id;

    return (
      <React.Fragment>
        {/* Overlay loading spinner when moving to next criterion or grading in progress */}
        {isProcessingRubric && criteriaAssessments.length > 0 && (
          <div className="grading-overlay-loading">
            <div className="grading-overlay-blur"></div>
            <div className="grading-overlay-spinner">
              <svg width="56" height="56" viewBox="0 0 48 48">
                <circle className="spinner-bg" cx="24" cy="24" r="20" fill="none" stroke="#e0e0e0" strokeWidth="5"/>
                <circle className="spinner-fg" cx="24" cy="24" r="20" fill="none" stroke="#4cb5f5" strokeWidth="5" strokeLinecap="round" strokeDasharray="100, 40"/>
              </svg>
              <div className="grading-overlay-message">Loading next criterion...</div>
            </div>
          </div>
        )}
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
  <>
    {/* Visualize score change if a revision occurred */}
    {currentAssessment.revisionRationale ? (
      <div className="ai-score-comparison">
        <div className="score-box old-score">
          <span className="score-label">Old AI Score</span>
          <span className="score-value">{typeof currentAssessment.originalAiScore === 'number' && !isNaN(currentAssessment.originalAiScore)
            ? currentAssessment.originalAiScore
            : typeof currentAssessment.aiScore === 'number' && !isNaN(currentAssessment.aiScore)
              ? currentAssessment.aiScore
              : '—'}</span>
        </div>
        <div className="score-box revised-score">
          <span className="score-label">Revised AI Score</span>
          <span className="score-value">{typeof currentAssessment.aiScore === 'number' && !isNaN(currentAssessment.aiScore)
            ? currentAssessment.aiScore
            : '—'}</span>
        </div>
      </div>
    ) : (
      <div className="ai-score-revealed">{typeof currentAssessment.aiScore === 'number' && !isNaN(currentAssessment.aiScore) ? currentAssessment.aiScore : '—'}</div>
    )}
    {isRevisingScore && (
      <div className="score-revision-loading">Revising score based on edits...</div>
    )}
    {/* Only show rationale if a revision has occurred and rationale is present */}
    {currentAssessment.revisionRationale && (
      <div className="score-revision-rationale">{currentAssessment.revisionRationale}</div>
    )}
  </>
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
      </React.Fragment>
    );
  }

  return null;
};

export default InteractiveGrading;
