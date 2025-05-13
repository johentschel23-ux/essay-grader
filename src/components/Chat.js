import React, { useState, useEffect } from 'react';
import './Chat.css';
import { extractTextFromPdf } from '../utils/pdfUtils';
import geminiService from '../services/geminiService';
// import AdvancedPdfViewer from './AdvancedPdfViewer';
import InteractiveGrading from './InteractiveGrading';
import OverallAssessment from './OverallAssessment';
import RubricModal from './RubricModal';

const Chat = ({ pdfFile }) => {
  const [pdfContent, setPdfContent] = useState(null);
  
  // Add state for rubric functionality
  const [showRubricModal, setShowRubricModal] = useState(false);
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
    
    try {
      // Extract criteria from the rubric
      const criteria = await geminiService.extractRubricCriteria(rubricContent);
      setRubricCriteria(criteria);
      
      // Reset state for a new grading session
      setCurrentCriterionIndex(0);
      setCriteriaAssessments([]);
      setTeacherScores({});
      setShowAIScores({});
      setGradingComplete(false);
      setOverallAssessment(null);
      
      // Start grading the first criterion
      if (criteria.length > 0) {
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
    if (!criteria || index >= criteria.length) return;
    
    setIsProcessingRubric(true);
    
    try {
      const criterion = criteria[index];
      const assessment = await geminiService.gradeSingleCriterion(pdfContent, criterion);
      
      // Add the assessment to our state
      setCriteriaAssessments(prev => {
        const newAssessments = [...prev];
        newAssessments[index] = {
          ...criterion,
          ...assessment,
          aiScore: assessment.score
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
    setTeacherScores(prev => ({
      ...prev,
      [criterionId]: score
    }));
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
    const nextIndex = currentCriterionIndex + 1;
    if (nextIndex < rubricCriteria.length) {
      // If the assessment for the next criterion does not exist, grade it first
      if (!criteriaAssessments[nextIndex]) {
        await gradeCurrentCriterion(rubricCriteria, nextIndex);
      }
      setCurrentCriterionIndex(nextIndex);
      setShowEvidence(false);
    } else {
      // All criteria have been graded
      finishGrading();
    }
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
    setIsProcessingRubric(true);
    setGradingComplete(true);
    
    try {
      // Prepare criteria with scores for the overall assessment
      const criteriaWithScores = criteriaAssessments.map((assessment, index) => {
        const criterionId = assessment.id;
        return {
          ...assessment,
          teacherScore: teacherScores[criterionId] || null
        };
      });
      
      // Generate the overall assessment
      const assessment = await geminiService.generateOverallAssessment(pdfContent, criteriaWithScores);
      setOverallAssessment(assessment);
    } catch (error) {
      console.error('Error generating overall assessment:', error);
    } finally {
      setIsProcessingRubric(false);
    }
  };
  
  // Function to restart the grading process
  const restartGrading = () => {
    setCurrentCriterionIndex(0);
    setGradingComplete(false);
    setShowEvidence(false);
    setActivePdfEvidence(null);
  };

  const handleShowEvidenceInViewer = (evidenceFromCriterion) => {
    if (evidenceFromCriterion) {
      // Ensure it's an array for AdvancedPdfViewer
      const evidenceArray = Array.isArray(evidenceFromCriterion) ? evidenceFromCriterion : [evidenceFromCriterion];
      // Transform to expected IHighlight structure if necessary
      const transformedEvidence = evidenceArray.map(ev => ({
        id: ev.id || String(Math.random()), // Ensure an ID
        position: { 
            pageNumber: ev.pageNumber || ev.page, // Handle variations in prop name
            // We expect react-pdf-highlighter's searchHighlights to find the rects
            // If you have rects already, they would go here:
            // boundingRect: { x1, y1, x2, y2, width, height }
        },
        content: { text: ev.highlight }, // Text to search for
        comment: { text: ev.comment || ev.context || '' } // Comment/context for the highlight
      }));
      console.log("Chat.js: Setting active PDF evidence for viewer:", transformedEvidence);
      setActivePdfEvidence(transformedEvidence);
    } else {
      setActivePdfEvidence(null);
    }
  };

  const handleClearEvidenceInViewer = () => {
    console.log("Chat.js: Clearing active PDF evidence.");
    setActivePdfEvidence(null);
  };

  return (
    <div className="app-container">
      <div className="rubric-interface-container">
        <div className="rubric-header-main">
          <h2>Interactive Rubric Grading</h2>
          <div className="rubric-actions">
            <button 
              className="rubric-button" 
              onClick={() => setShowRubricModal(true)}
              disabled={isProcessingRubric}
            >
              {rubricContent ? 'Edit Rubric' : 'Add Rubric'}
            </button>
            {rubricContent && !criteriaAssessments.length && (
              <button 
                className="start-grading-button" 
                onClick={startInteractiveGrading}
                disabled={isProcessingRubric}
              >
                {isProcessingRubric ? 'Processing...' : 'Start Grading'}
              </button>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="rubric-main-content">
          {/* If we have criteria assessments, show the interactive grading interface */}
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
            />
          )}
          
          {/* If we don't have criteria assessments yet but have rubric content */}
          {!criteriaAssessments.length && !isProcessingRubric && rubricContent && (
            <div className="rubric-preview-main">
              <h3>Current Rubric:</h3>
              <pre className="rubric-content-preview">{rubricContent}</pre>
              <div className="start-grading-container">
                <p>Click "Start Grading" to begin the interactive grading process.</p>
                <button 
                  className="start-grading-button"
                  onClick={startInteractiveGrading}
                >
                  Start Grading
                </button>
              </div>
            </div>
          )}
          
          {/* If we don't have a rubric yet */}
          {!rubricContent && (
            <div className="no-rubric-message-main">
              <div className="welcome-message">
                <h3>Welcome to the Interactive Rubric Grader</h3>
                <p>This tool helps you grade essays using custom rubrics with AI assistance.</p>
                <ol className="instruction-list">
                  <li>Upload a PDF essay using the panel on the left</li>
                  <li>Click "Add Rubric" to enter your grading criteria</li>
                  <li>Start the interactive grading process</li>
                  <li>Grade each criterion and compare with AI assessment</li>
                  <li>Review the final comprehensive assessment</li>
                </ol>
                <button 
                  className="add-rubric-button"
                  onClick={() => setShowRubricModal(true)}
                >
                  Add Rubric
                </button>
              </div>
            </div>
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
  );
};

export default Chat;
