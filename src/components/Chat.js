import React, { useState, useEffect } from 'react';
import './Chat.css';
import { extractTextFromPdf } from '../utils/pdfUtils';
import geminiService from '../services/geminiService';
import AdvancedPdfViewer from './AdvancedPdfViewer';

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
      setCurrentCriterionIndex(nextIndex);
      setShowEvidence(false);
      
      // Check if we need to grade this criterion
      if (!criteriaAssessments[nextIndex]) {
        await gradeCurrentCriterion(rubricCriteria, nextIndex);
      }
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
  
  // Function to render the interactive grading interface
  const renderInteractiveGrading = () => {
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
                <p className="justification">{currentAssessment.justification}</p>
                
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
                        {item.context && <div className="evidence-context">Context: {item.context}</div>} {/* Optionally display context */}
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
                      {!teacherScores[criterionId] ? 'Enter your score first' : 'Reveal AI Score'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="navigation-buttons">
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
                  disabled={!teacherScores[criterionId]}
                >
                  {currentCriterionIndex === rubricCriteria.length - 1 ? 'Finish Grading' : 'Next Criterion'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: PDF Viewer */}
          <div className="pdf-viewer-column">
            {pdfFile && (
              <AdvancedPdfViewer
                url={pdfFile} // Pass the actual pdfFile object/blob/URL
                evidence={activePdfEvidence} // Pass the evidence to highlight
              />
            )}
            {!pdfFile && (
              <div className="pdf-placeholder">
                <p>Please upload a PDF to view it here.</p>
                <p>Once an essay and rubric are processed, click "Show Evidence in PDF" on a criterion to see highlights.</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Fallback
    return (
      <div className="no-criteria-message">
        <p>No rubric criteria found. Please check your rubric format and try again.</p>
      </div>
    );
  };
  
  // Function to render the overall assessment
  const renderOverallAssessment = () => {
    if (!overallAssessment) {
      return (
        <div className="loading-container">
          <p>Generating overall assessment...</p>
        </div>
      );
    }
    
    return (
      <div className="overall-assessment-container">
        <h2>Grading Complete</h2>
        
        <div className="assessment-summary">
          <div className="assessment-section strengths-section">
            <h3>Strengths</h3>
            <p>{overallAssessment.strengths}</p>
          </div>
          
          <div className="assessment-section improvements-section">
            <h3>Areas for Improvement</h3>
            <p>{overallAssessment.improvements}</p>
          </div>
          
          <div className="assessment-section grade-section">
            <h3>Overall Grade</h3>
            <div className="final-grade">{overallAssessment.overallGrade}</div>
          </div>
          
          <div className="assessment-section advice-section">
            <h3>Advice for Student</h3>
            <p>{overallAssessment.advice}</p>
          </div>
        </div>
        
        <div className="criteria-summary">
          <h3>Criteria Breakdown</h3>
          <table className="criteria-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Your Score</th>
                <th>AI Score</th>
                <th>Final Score</th>
              </tr>
            </thead>
            <tbody>
              {criteriaAssessments.map((assessment) => {
                const criterionId = assessment.id;
                const teacherScore = teacherScores[criterionId] || '-';
                const aiScore = assessment.aiScore || '-';
                const finalScore = teacherScore !== '-' ? teacherScore : aiScore;
                
                return (
                  <tr key={criterionId}>
                    <td>{assessment.name}</td>
                    <td>{teacherScore}</td>
                    <td>{aiScore}</td>
                    <td className="final-score">{finalScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="assessment-actions">
          <button 
            className="restart-button"
            onClick={restartGrading}
          >
            Grade Again
          </button>
          <button 
            className="close-button"
            onClick={() => setGradingComplete(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
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
            renderInteractiveGrading()
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
      {showRubricModal && (
        <div className="modal-overlay">
          <div className="rubric-modal">
            <div className="rubric-modal-header">
              <h3>Add Grading Rubric</h3>
              <button 
                className="close-modal-button" 
                onClick={() => setShowRubricModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="rubric-modal-content">
              <p>Paste your grading rubric below. The AI will use this to evaluate the essay.</p>
              <p className="rubric-example-toggle" onClick={() => {
                const exampleRubric = `Criteria | Excellent (5) | Good (4) | Satisfactory (3) | Needs Improvement (2) | Poor (1)
1. Depth of Reflection on Design Choices | Provides insightful and detailed reflection on specific design decisions; clearly explains rationale and implications. | Reflects on key design decisions with some insight; rationale is mostly clear. | Discusses design decisions but with limited depth or explanation. | Mentions design choices with little or no explanation of rationale. | Little to no reflection on design decisions.
2. Engagement with Week 1 Insights | Thoughtfully revisits week 1 ideas; clearly connects initial thoughts with how the proposal evolved. | Addresses week 1 reflections and links them to the proposal, with minor gaps. | Refers to week 1 ideas but connections are vague or underdeveloped. | Minimal or unclear reference to week 1 reflections. | No reference to week 1 reflections.
3. Application of Hoffman & Zhao's Guidance | Demonstrates a strong understanding of Hoffman & Zhao's advice and critically evaluates the proposal in light of it. | Applies Hoffman & Zhao's framework with moderate critical evaluation. | Mentions Hoffman & Zhao's advice but applies it superficially. | Minimal engagement with Hoffman & Zhao; weak application. | No mention or application of Hoffman & Zhao's work.
4. Integration with Broader HRI Context | Effectively situates the proposal within the broader HRI field; shows awareness of relevance and implications. | Provides a clear link between the proposal and the HRI field. | Makes general statements about the proposal's relevance to HRI. | Vague or minimal connection to broader HRI context. | No mention of the broader HRI field.
5. Clarity and Structure | Writing is clear, well-organized, and free from errors; arguments flow logically. | Generally clear and well-structured, with minor issues in flow or clarity. | Understandable but may lack coherence or have several writing issues. | Disorganized or unclear writing that hinders understanding. | Poorly written with little structure or clarity.`;
                setRubricContent(exampleRubric);
              }}>Click here to see an example rubric</p>
              <textarea 
                className="rubric-textarea"
                value={rubricContent}
                onChange={(e) => setRubricContent(e.target.value)}
                placeholder="Paste your rubric here..."
                rows={10}
              />
              <div className="rubric-modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowRubricModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-button"
                  onClick={() => {
                    if (rubricContent.trim() !== '') {
                      setShowRubricModal(false);
                      // Save the rubric content
                      // Reset any previous grading session
                      setRubricCriteria([]);
                      setCriteriaAssessments([]);
                      setTeacherScores({});
                      setShowAIScores({});
                      setGradingComplete(false);
                      setOverallAssessment(null);
                    } else {
                      alert('Please enter a rubric before saving.');
                    }
                  }}
                >
                  Save Rubric
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
