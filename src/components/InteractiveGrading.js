import React from 'react';
import './InteractiveGrading.css';

import AdvancedPdfViewer from './AdvancedPdfViewer';
import AssessmentSection from './AssessmentSection';
import EvidenceSection from './EvidenceSection';

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
  essayContent, // <-- add essayContent as a prop
  gradeCurrentCriterion, // <-- make sure this is passed as a prop
  setGradingComplete, // <-- add this prop
  assessmentType // <-- NEW: pass assessmentType as a prop
}) => {
  // --- Handler to ensure last criterion is graded before finishing ---
  const handleFinishGrading = async () => {
    const lastIndex = rubricCriteria.length - 1;
    if (!criteriaAssessments[lastIndex]) {
      await gradeCurrentCriterion(rubricCriteria, lastIndex);
    }
    await finishGrading();
    // Now that all grading and assessment is done, mark grading as complete
    if (typeof setGradingComplete === 'function') {
      setGradingComplete(true);
    }
  };


  const [editingJustification, setEditingJustification] = React.useState(false);
  const [editedJustification, setEditedJustification] = React.useState('');
  const [editedBullets, setEditedBullets] = React.useState([]);

  // State for interactive highlight on hover
  const [hoveredEvidenceIndex, setHoveredEvidenceIndex] = React.useState(null);
  const [hoveredAssessmentIndexes, setHoveredAssessmentIndexes] = React.useState([]);

  React.useEffect(() => {
    if (criteriaAssessments.length > 0 && currentCriterionIndex < criteriaAssessments.length) {
      const justification = criteriaAssessments[currentCriterionIndex].justification || '';
      if (assessmentType === 'bullets' && Array.isArray(justification)) {
        setEditedBullets(justification);
        setEditedJustification('');
      } else {
        setEditedJustification(justification);
        setEditedBullets([]);
      }
      setEditingJustification(false);
    }
  }, [currentCriterionIndex, criteriaAssessments, assessmentType]);

  const [isRevisingScore, setIsRevisingScore] = React.useState(false);
  const [revisionRationale, setRevisionRationale] = React.useState('');

  const handleSaveJustification = async () => {
  const now = () => new Date().toISOString();
  const currentAssessment = criteriaAssessments[currentCriterionIndex];
  let newJustification;
  if (assessmentType === 'bullets') {
    newJustification = editedBullets.map(b => b.trim()).filter(b => b);
  } else {
    newJustification = editedJustification;
  }
  const wasEdited = JSON.stringify(newJustification) !== JSON.stringify(currentAssessment.justification);
  let updatedAssessment = { ...currentAssessment, justification: newJustification, essayContent: essayContent };
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

  // Only show the final screen if gradingComplete is true
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



  // Always show the current criterion (even for the last one) until gradingComplete is true
  if (rubricCriteria.length > 0 && criteriaAssessments.length > 0 && !gradingComplete) {
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
              <AssessmentSection
                assessmentType={assessmentType}
                currentAssessment={currentAssessment}
                editingJustification={editingJustification}
                editedJustification={editedJustification}
                editedBullets={editedBullets}
                setEditedJustification={setEditedJustification}
                setEditedBullets={setEditedBullets}
                setEditingJustification={setEditingJustification}
                hoveredAssessmentIndexes={hoveredAssessmentIndexes}
                setHoveredAssessmentIndexes={setHoveredAssessmentIndexes}
                handleSaveJustification={handleSaveJustification}
              />
            </div>
            <EvidenceSection
              showEvidence={showEvidence}
              setShowEvidence={setShowEvidence}
              currentAssessment={currentAssessment}
              hoveredEvidenceIndex={hoveredEvidenceIndex}
              setHoveredEvidenceIndex={setHoveredEvidenceIndex}
              hoveredAssessmentIndexes={hoveredAssessmentIndexes}
              setHoveredAssessmentIndexes={setHoveredAssessmentIndexes}
            />
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
        <div className="grading-navigation-row">
  <button
    className="grading-nav-btn prev"
    onClick={moveToPreviousCriterion}
    disabled={currentCriterionIndex === 0}
  >
    ◀ Previous
  </button>
  {currentCriterionIndex < rubricCriteria.length - 1 ? (
    <button
      className="grading-nav-btn next"
      onClick={moveToNextCriterion}
    >
      Next ▶
    </button>
  ) : (
    <button
      className="grading-nav-btn finish"
      onClick={handleFinishGrading}
    >
      Finish Grading
    </button>
  )}
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

