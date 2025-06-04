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
  assessmentType, // <-- NEW: pass assessmentType as a prop
  contextId // <-- pass contextId for context caching
}) => {
  // --- Handler to ensure last criterion is graded before finishing ---
  const handleFinishGrading = async () => {
    const lastIndex = rubricCriteria.length - 1;
    if (!criteriaAssessments[lastIndex]) {
      await gradeCurrentCriterion(rubricCriteria, lastIndex);
    }
    await finishGrading();
    // Always mark grading as complete after finishing, regardless of assessment state
    if (typeof setGradingComplete === 'function') {
      setGradingComplete(true);
      console.log('[handleFinishGrading] gradingComplete set to true');
    }
  };


  const [editingJustification, setEditingJustification] = React.useState(false);
  const [editedJustification, setEditedJustification] = React.useState('');
  const [editedBullets, setEditedBullets] = React.useState([]);

  // Fix off-by-one: Save justification only after state is set
  React.useEffect(() => {
    if (editingJustification === 'pending-save') {
      handleSaveJustification();
      setEditingJustification(false);
    }
  }, [editedJustification, editedBullets, editingJustification]);

  // State for interactive highlight on hover
  const [hoveredEvidenceIndex, setHoveredEvidenceIndex] = React.useState(null);
  const [hoveredAssessmentIndexes, setHoveredAssessmentIndexes] = React.useState([]);

  // Only reset editing state when criterion changes or grading restarts
React.useEffect(() => {
  setEditingJustification(false);
}, [currentCriterionIndex, criteriaAssessments.length, assessmentType]);

  const [isRevisingScore, setIsRevisingScore] = React.useState(false);
const [gradingError, setGradingError] = React.useState(null);


  const handleSaveJustification = async () => {
  setGradingError(null);
  const now = () => new Date().toISOString();
  const currentAssessmentObj = criteriaAssessments[currentCriterionIndex];
  const latestRevision = currentAssessmentObj?.revisions?.length
    ? currentAssessmentObj.revisions[currentAssessmentObj.revisions.length - 1]
    : currentAssessmentObj;
  let newJustification;
  if (assessmentType === 'bullets') {
    newJustification = editedBullets.map(b => b.trim()).filter(b => b);
  } else {
    newJustification = editedJustification;
  }
  const wasEdited = JSON.stringify(newJustification) !== JSON.stringify(latestRevision.justification);
  // 1. Immediately push a new revision with the updated justification (no new AI score yet)
  let immediateRevision = {
    ...latestRevision,
    justification: newJustification,
    revisedAssessmentText: newJustification,
    essayContent: essayContent,
    // Clear AI score/rationale until LLM returns
    aiScore: latestRevision.aiScore,
    revisionRationale: '',
    originalAiScore: latestRevision.aiScore
  };
  setEditingJustification(false);

  // Update UI instantly
  const updatedAssessmentsImmediate = criteriaAssessments.map((assessmentObj, idx) => {
    if (idx === currentCriterionIndex) {
      return {
        ...assessmentObj,
        revisions: [...(assessmentObj.revisions || [assessmentObj]), immediateRevision]
      };
    }
    return { ...assessmentObj };
  });
  setCriteriaAssessments(updatedAssessmentsImmediate);

  // 2. Then, asynchronously update with revised AI score/rationale
  if (wasEdited) {
    setIsRevisingScore(true);
    try {
      console.log(`[${now()}] [handleSaveJustification] Calling LLM for revised score...`, {
        essayContent,
        criterion: latestRevision,
        originalJustification: latestRevision.justification || '',
        editedJustification,
        originalScore: latestRevision.aiScore
      });
      const { revisedScore, rationale } = await require('../services/geminiService').reviseCriterionScoreWithJustification(
        essayContent || '',
        latestRevision,
        latestRevision.justification || '',
        editedJustification,
        latestRevision.aiScore
      );
      console.log(`[${now()}] [handleSaveJustification] LLM response:`, { revisedScore, rationale });
      // Update the latest revision with the new AI score/rationale
      const updatedAssessmentsFinal = updatedAssessmentsImmediate.map((assessmentObj, idx) => {
        if (idx === currentCriterionIndex) {
          const revs = assessmentObj.revisions || [assessmentObj];
          const lastIdx = revs.length - 1;
          const updatedRevs = revs.map((rev, i) => i === lastIdx ? {
            ...rev,
            aiScore: revisedScore,
            revisionRationale: rationale,
            essayContent: essayContent
          } : rev);
          return {
            ...assessmentObj,
            revisions: updatedRevs
          };
        }
        return { ...assessmentObj };
      });
      setCriteriaAssessments(updatedAssessmentsFinal);
    } catch (error) {
      // Enhanced error handling for Gemini API overload
      if (error && (error.message === 'MODEL_OVERLOADED' || (error.error && error.error === 'MODEL_OVERLOADED'))) {
        setGradingError('The Gemini API is overloaded. Please try again in a few minutes.');
      } else if (error && error.error === 'MODEL_OVERLOADED') {
        setGradingError('The Gemini API is overloaded. Please try again in a few minutes.');
      } else {
        setGradingError('There was an error revising the score. The original score is retained.');
      }
      console.error(`[${now()}] [handleSaveJustification] Error during LLM call:`, error);
    } finally {
      setIsRevisingScore(false);
    }
  }
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
    const currentAssessmentObj = criteriaAssessments[currentCriterionIndex];
const currentAssessment = currentAssessmentObj?.revisions?.length
  ? currentAssessmentObj.revisions[currentAssessmentObj.revisions.length - 1]
  : currentAssessmentObj;
    const criterionId = currentAssessment.id;

    return (
      <React.Fragment>
        {/* Error message for grading (e.g., Gemini API overload) */}
        {gradingError && (
          <div className="rubric-parse-error" style={{marginBottom: 18, marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div className="rubric-error-message">{gradingError}</div>
            <div className="rubric-error-actions">
              <button className="rubric-revise-btn" onClick={() => setGradingError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
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

