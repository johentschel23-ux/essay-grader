import React from 'react';
import './RubricModal.css';

const RubricModal = ({
  rubricContent,
  setRubricContent,
  setShowRubricModal,
  setRubricCriteria,
  setCriteriaAssessments,
  setTeacherScores,
  setShowAIScores,
  setGradingComplete,
  setOverallAssessment
}) => {
  return (
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
  );
};

export default RubricModal;
