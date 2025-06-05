import React, { useState, useEffect } from 'react';
import './Chat.css';
import { extractTextFromPdf } from '../utils/pdfUtils';
import geminiService from '../services/geminiService';

import AssessmentSettingsSection from './AssessmentSettingsSection';
import RubricPreview from './RubricPreview';
import WelcomeSection from './WelcomeSection';
// import AdvancedPdfViewer from './AdvancedPdfViewer';
import InteractiveGrading from './InteractiveGrading';
import OverallAssessment from './OverallAssessment';
import RubricModal from './RubricModal';
import ContextDialog from './ContextDialog';


const Chat = ({ pdfFile }) => {
  const [criterionStartTime, setCriterionStartTime] = useState(null); // Track when user starts a criterion
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [contextList, setContextList] = useState([]);
  const [pdfContent, setPdfContent] = useState(null);
  // Assessment settings state
  const [assessmentType, setAssessmentType] = useState('flow'); // 'flow' or 'bullets'
  const [assessmentLength, setAssessmentLength] = useState('long'); // 'long', 'medium', 'short'

  // Add state for rubric functionality
  const [showRubricModal, setShowRubricModal] = useState(false);

  // --- Context Dialog Button Helper ---
  const handleCloseContextDialog = () => setShowContextDialog(false);
  const [rubricContent, setRubricContent] = useState('');
  const [isProcessingRubric, setIsProcessingRubric] = useState(false);
  

  
  // State for interactive grading
  const [rubricCriteria, setRubricCriteria] = useState([]);
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  const [criteriaAssessments, setCriteriaAssessments] = useState([]);
  const [showEvidence, setShowEvidence] = useState(false);
  const [teacherScores, setTeacherScores] = useState({});
  const [showAIScores, setShowAIScores] = useState({});
  const [gradingComplete, setGradingComplete] = useState(false);
  const [overallAssessment, setOverallAssessment] = useState(null);
  const [activePdfEvidence, setActivePdfEvidence] = useState(null);


  // Extract text from PDF when it changes
  useEffect(() => {
    const extractPdfText = async () => {
      if (pdfFile) {
        try {
          const textContent = await extractTextFromPdf(pdfFile);
          setPdfContent(textContent); // Correctly use the direct string result
          
          if (textContent) {
            console.log('PDF text content extracted and set in Chat.js.');
          } else {
            console.warn('PDF text extraction resulted in empty content for Chat.js.');
          }
        } catch (error) {
          console.error('Error during PDF text extraction call in Chat.js:', error);
          setPdfContent(null); // Ensure pdfContent is null on error
        }
      } else {
        setPdfContent(null); // Clear pdfContent if pdfFile prop becomes null
      }
    };

    extractPdfText();
  }, [pdfFile]);

  // Check if essay is very long and might cause quota issues
  if (pdfContent) {
    const estimatedTokens = pdfContent.length / 4; // Rough estimate: ~4 chars per token
    if (estimatedTokens > 30000) {
      console.warn('Essay is very long and may exceed token limits');
    }
  }

  // Function to start the interactive rubric grading process
  const startInteractiveGrading = async () => {
    if (!pdfContent) {
      alert('Please upload a PDF document first to analyze its content.');
      return;
    }
    
    if (!rubricContent || rubricContent.trim() === '') {
      alert('Please add a rubric first before grading with it.');
      return;
    }
    
    setIsProcessingRubric(true);
    // Show spinner immediately by putting InteractiveGrading in loading state
    setRubricCriteria([{ loading: true }]);
    setCriteriaAssessments([]);
    setCurrentCriterionIndex(0);
    setTeacherScores({});
    setShowAIScores({});
    setGradingComplete(false);
    setOverallAssessment(null);

    try {
      // Extract criteria from the rubric
      const criteria = await geminiService.extractRubricCriteria(rubricContent);
      setRubricCriteria(criteria);

      // Start grading the first criterion
      if (criteria.length > 0) {
        setCriterionStartTime(Date.now()); // Start timer for first criterion
        await gradeCurrentCriterion(criteria, 0);
      }
    } catch (error) {
      console.error('Error starting interactive grading:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessingRubric(false);
    }
  };
  
  // Function to grade the current criterion
  const gradeCurrentCriterion = async (criteria, index) => {
    // Pass assessmentType and assessmentLength as options
    const options = {
      assessmentType,
      assessmentLength
    };

    if (!criteria || index >= criteria.length) return;
    
    setIsProcessingRubric(true);
    
    try {
      const criterion = criteria[index];
      // Always pass contextList for context-aware grading
      const assessment = await geminiService.gradeSingleCriterion(pdfContent, criterion, options, contextList);
      // Add the assessment to our state
      setCriteriaAssessments(prev => {
        const newAssessments = [...prev];
        newAssessments[index] = {
          ...criterion,
          ...assessment,
          assessment_text: assessment.assessmentText || assessment.assessment_text || assessment.text || null,
          aiScore: assessment.aiScore ?? assessment.new_ai_grade ?? assessment.score ?? null, // Always set aiScore for UI
          originalAiScore: null, // No revision yet
          revisionRationale: null, // No revision yet
          revised_assessment_text: assessment.revisedAssessmentText || assessment.revised_assessment_text || null,
          old_ai_grade: assessment.oldAiScore || assessment.old_ai_grade || null,
          new_ai_grade: assessment.aiScore ?? assessment.new_ai_grade ?? assessment.score ?? null,
          user_grade: (teacherScores[criterion.id || criterion.title || String(index)] ?? null)
        };
        return newAssessments;
      });
    } catch (error) {
      console.error(`Error grading criterion ${index}:`, error);
    } finally {
      setIsProcessingRubric(false);
    }
  };
  
  // Function to handle teacher score input
  const handleTeacherScoreInput = (criterionId, score) => {
    setTeacherScores(prev => {
      // Only update user grade in state; DB write is handled in moveToNextCriterion
      return {
        ...prev,
        [criterionId]: score
      };
    });
  };
  
  // Function to reveal AI score for a criterion
  const revealAIScore = (criterionId) => {
    setShowAIScores(prev => ({
      ...prev,
      [criterionId]: true
    }));
  };
  
  // Function to move to the next criterion
  const moveToNextCriterion = async () => {
    // === Record current criterion data before moving ===
    if (criteriaAssessments[currentCriterionIndex]) {
      const assessment = criteriaAssessments[currentCriterionIndex];
      const criterion = rubricCriteria[currentCriterionIndex];
      const essay_id = pdfContent ? String(pdfContent.length) : String(Date.now());
      const criterion_id = criterion.id || criterion.title || String(currentCriterionIndex);
      // Robust extraction of fields for DB
      let assessment_text = null;
      let revised_assessment_text = null;
      let old_ai_grade = null;
      let new_ai_grade = null;
      // If revised, store both old and new
      // Always record old_ai_grade (initial AI score), even if no revision
      if (assessment.originalAiScore !== undefined && assessment.originalAiScore !== null) {
        old_ai_grade = assessment.originalAiScore;
      } else if (assessment.oldAiScore !== undefined && assessment.oldAiScore !== null) {
        old_ai_grade = assessment.oldAiScore;
      } else if (assessment.old_ai_grade !== undefined && assessment.old_ai_grade !== null) {
        old_ai_grade = assessment.old_ai_grade;
      } else if (assessment.aiScore !== undefined && assessment.aiScore !== null) {
        old_ai_grade = assessment.aiScore;
      } else if (assessment.new_ai_grade !== undefined && assessment.new_ai_grade !== null) {
        old_ai_grade = assessment.new_ai_grade;
      } else if (assessment.score !== undefined && assessment.score !== null) {
        old_ai_grade = assessment.score;
      } else {
        old_ai_grade = null;
      }
      assessment_text = assessment.justification || assessment.assessment_text || assessment.assessmentText || null;
      if (assessment.revisionRationale || assessment.revisedAssessmentText || assessment.revised_assessment_text) {
        revised_assessment_text = assessment.revisedAssessmentText || assessment.revised_assessment_text || null;
        new_ai_grade = assessment.aiScore ?? assessment.new_ai_grade ?? assessment.score ?? null;
      } else {
        revised_assessment_text = null;
        new_ai_grade = null;
      }
      const user_grade = assessment.user_grade ?? teacherScores[criterion_id] ?? null;
      const time_spent_seconds = criterionStartTime ? (Date.now() - criterionStartTime) / 1000 : null;
      if (window.electronAPI && typeof window.electronAPI.recordGrade === 'function') {
        window.electronAPI.recordGrade({
          essay_id,
          criterion_id,
          assessment_text,
          revised_assessment_text,
          old_ai_grade,
          new_ai_grade,
          user_grade,
          time_spent_seconds,
          extra_data: {
            assessment,
            criterion,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    // === End record ===

    const nextIndex = currentCriterionIndex + 1;
    if (nextIndex < rubricCriteria.length) {
      // If the assessment for the next criterion does not exist, grade it first
      if (!criteriaAssessments[nextIndex]) {
        await gradeCurrentCriterion(rubricCriteria, nextIndex);
      }
      setCurrentCriterionIndex(nextIndex);
      setShowEvidence(false);
      setCriterionStartTime(Date.now()); // Reset timer for next criterion
    }
    // Do not call finishGrading here; the UI will handle calling finishGrading when on the last criterion.
  };

  
  // Function to move to the previous criterion
  const moveToPreviousCriterion = () => {
    if (currentCriterionIndex > 0) {
      setCurrentCriterionIndex(currentCriterionIndex - 1);
      setShowEvidence(false);
    }
  };
  
  // Function to finish the grading process
  const finishGrading = async () => {
    // === Record last criterion data on finish ===
    if (criteriaAssessments[currentCriterionIndex]) {
      const assessment = criteriaAssessments[currentCriterionIndex];
      const criterion = rubricCriteria[currentCriterionIndex];
      const essay_id = pdfContent ? String(pdfContent.length) : String(Date.now());
      const criterion_id = criterion.id || criterion.title || String(currentCriterionIndex);
      const user_grade = assessment.user_grade ?? teacherScores[criterion_id] ?? null;
      const assessment_text = assessment.assessment_text ?? assessment.assessmentText ?? assessment.text ?? null;
      const revised_assessment_text = assessment.revised_assessment_text ?? assessment.revisedAssessmentText ?? null;
      const old_ai_grade = assessment.old_ai_grade ?? assessment.oldAiScore ?? null;
      const new_ai_grade = assessment.new_ai_grade ?? assessment.aiScore ?? assessment.score ?? null;
      const time_spent_seconds = criterionStartTime ? (Date.now() - criterionStartTime) / 1000 : null;
      if (window.electronAPI && typeof window.electronAPI.recordGrade === 'function') {
        window.electronAPI.recordGrade({
          essay_id,
          criterion_id,
          ai_grade: old_ai_grade ?? new_ai_grade,
          user_grade,
          assessment_text,
          revised_assessment_text,
          old_ai_grade,
          new_ai_grade,
          time_spent_seconds,
          extra_data: {
            assessment,
            criterion,
            timestamp: new Date().toISOString(),
            user_grade,
            assessment_text,
            revised_assessment_text,
            old_ai_grade,
            new_ai_grade,
            time_spent_seconds
          }
        });
      }
    }
    // === End record ===
    const options = {
      assessmentType,
      assessmentLength
    };

    setIsProcessingRubric(true);
    
    // Prepare criteria with scores for the overall assessment
    const criteriaWithScores = criteriaAssessments.map((assessment) => {
      const criterionId = assessment.id;
      return {
        ...assessment,
        teacherScore: teacherScores[criterionId] || null
      };
    });
    // Generate the overall assessment
    try {
      let assessment = await geminiService.generateOverallAssessment(pdfContent, criteriaWithScores, options, contextList);
      console.log('[finishGrading] Raw LLM assessment:', assessment);
      if (typeof assessment === 'string') {
        try {
          assessment = JSON.parse(assessment);
        } catch (e) {
          console.error('[finishGrading] Failed to parse LLM assessment as JSON:', e, assessment);
          assessment = {
            strengths: 'Error parsing assessment',
            weaknesses: 'The LLM response could not be parsed as JSON.',
            recommendations: '',
            finalScore: null,
            criteria: []
          };
        }
      }
      console.log('[finishGrading] Parsed overall assessment:', assessment);
      setOverallAssessment(assessment);
    } catch (err) {
      console.error('[finishGrading] Error from generateOverallAssessment:', err);
      setOverallAssessment({
        strengths: 'Error generating assessment',
        weaknesses: err.message || 'Unknown error',
        recommendations: '',
        finalScore: null,
        criteria: []
      });
    }
    setIsProcessingRubric(false);
  };

  // Function to restart the grading process
  const restartGrading = () => {
    setRubricCriteria([]);
    setCriteriaAssessments([]);
    setCurrentCriterionIndex(0);
    setTeacherScores({});
    setShowAIScores({});
    setGradingComplete(false);
    setOverallAssessment(null);
    setShowEvidence(false);
    setActivePdfEvidence(null);
    setRubricContent(''); // Optionally clear rubric text as well
  };

  return (
    <>


    <div className="app-container">
      {/* Restart App Button (top-right corner, always visible) */}
      <button
        className="restart-app-btn"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 32,
          zIndex: 1000,
          background: 'linear-gradient(90deg, #b00020 60%, #ff1744 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 26px',
          fontWeight: 700,
          fontSize: '1.08em',
          boxShadow: '0 2px 8px rgba(176,0,32,0.13)',
          cursor: 'pointer',
          transition: 'background 0.18s, box-shadow 0.18s, transform 0.13s',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
        title="Restart the application (reset all progress)"
        onClick={() => {
          if (window.confirm('Are you sure you want to restart? All unsaved progress will be lost.')) {
            window.location.reload();
          }
        }}
      >
        <span style={{fontSize: 20, marginRight: 6}}>⟳</span>
        Restart App
      </button>
      <div className="rubric-interface-container">
        {/* Main content area */}
        <div className="rubric-main-content">
  {!rubricContent ? (
    <WelcomeSection onAddRubric={() => setShowRubricModal(true)} />
  ) : (
    <>
      {!(rubricCriteria.length > 0 || criteriaAssessments.length > 0) && (
        <>
          <AssessmentSettingsSection
            assessmentType={assessmentType}
            setAssessmentType={setAssessmentType}
            assessmentLength={assessmentLength}
            setAssessmentLength={setAssessmentLength}
          />
          <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 10px 0', gap: 12 }}>
  <button
    className="add-context-btn"
    type="button"
    onClick={() => setShowContextDialog(true)}
    title="Add optional context information (e.g., course outline, assignment prompt)"
  >
    <span style={{ fontSize: 22, marginRight: 6 }}>➕</span> Add Context
  </button>
</div>
          {showContextDialog && (
            <ContextDialog
              open={showContextDialog}
              onClose={handleCloseContextDialog}
              contextList={contextList}
              setContextList={setContextList}
            />
          )}
        </>
      )}
      {/* Context dump button (visible before grading starts) */}
      {/* Temporarily disabled */}
      {/* {!(rubricCriteria.length > 0 || criteriaAssessments.length > 0) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '18px 0 10px 0', gap: 12 }}>
          <button
            className="add-context-btn"
            type="button"
            onClick={() => setShowContextDialog(true)}
            style={{ fontSize: '1.07em', display: 'flex', alignItems: 'center', gap: 7 }}
            title="Add optional context information (e.g., course outline, assignment prompt)"
          >
            <span style={{ fontSize: 22, marginRight: 6 }}>➕</span> Add Context
          </button>
        </div>
      )} */}
      {(rubricCriteria.length > 0 || criteriaAssessments.length > 0) && (
        <InteractiveGrading
          isProcessingRubric={isProcessingRubric}
          rubricCriteria={rubricCriteria}
          gradingComplete={gradingComplete}
          renderOverallAssessment={() => (
            <OverallAssessment
              overallAssessment={overallAssessment}
              criteriaAssessments={criteriaAssessments}
              teacherScores={teacherScores}
              restartGrading={restartGrading}
              setGradingComplete={setGradingComplete}
            />
          )}
          overallAssessment={overallAssessment}
          criteriaAssessments={criteriaAssessments}
          setCriteriaAssessments={setCriteriaAssessments}
          currentCriterionIndex={currentCriterionIndex}
          showEvidence={showEvidence}
          setShowEvidence={setShowEvidence}
          teacherScores={teacherScores}
          handleTeacherScoreInput={handleTeacherScoreInput}
          showAIScores={showAIScores}
          revealAIScore={revealAIScore}
          moveToNextCriterion={moveToNextCriterion}
          moveToPreviousCriterion={moveToPreviousCriterion}
          finishGrading={finishGrading}
          restartGrading={restartGrading}
          pdfFile={pdfFile}
          activePdfEvidence={activePdfEvidence}
          essayContent={pdfContent}
          gradeCurrentCriterion={gradeCurrentCriterion}
          setGradingComplete={setGradingComplete}
          assessmentType={assessmentType}
          // Temporarily disabled
          // contextList={contextList}
          // contextId={contextId}
        />
      )}
      {/* If we don't have criteria assessments yet but have rubric content */}


      {!criteriaAssessments.length && !isProcessingRubric && rubricContent && (
        <RubricPreview
          rubricContent={rubricContent}
          startGrading={startInteractiveGrading}
          onReviseRubric={() => setShowRubricModal(true)}
          pdfUploaded={!!pdfFile}
        />
      )}

    </>
  )}
</div>
      </div>  
      {/* Rubric Modal */}
      {showRubricModal && (
        <RubricModal
          rubricContent={rubricContent}
          setRubricContent={setRubricContent}
          setShowRubricModal={setShowRubricModal}
          setRubricCriteria={setRubricCriteria}
          setCriteriaAssessments={setCriteriaAssessments}
          setTeacherScores={setTeacherScores}
          setShowAIScores={setShowAIScores}
          setGradingComplete={setGradingComplete}
          setOverallAssessment={setOverallAssessment}
        />
      )}
      

    </div>
    </>
  );
};

export default Chat;
