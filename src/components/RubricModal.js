import React, { useState } from 'react';
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
  // Use local state for the modal
  const [localRubric, setLocalRubric] = useState(rubricContent || '');
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
            const exampleRubric = `Criteria | Excellent (5) | Good (4) | Satisfactory (3) | Needs Improvement (2) | Insufficient (1)
1. System Design (SysDes) | The creation process is thoroughly described from analysis to implementation. Complexities and uncertainties (requirements, technical, organizational) are clearly addressed. The use of SE thinking tracks is explicitly discussed. | The creation process is well described. Some complexities and uncertainties are acknowledged, though the discussion is somewhat superficial. SE thinking tracks are mentioned but not deeply explored. | The process is mostly described, with some reflection on complexities. SE thinking tracks are referenced but not clearly integrated. | The process is partially described, with minimal reflection on complexities or SE thinking tracks. | No meaningful description of the process or SE thinking tracks is provided.
2. Tools | A coherent set of SE techniques is presented, clearly aligned with the process. Their application and benefits are well explained. | SE techniques are listed and mostly aligned with the process. Their use and benefits are described with reasonable clarity. | SE techniques are listed and somewhat aligned with the process, but their use or benefits are not clearly explained. | SE techniques are mentioned briefly, with little explanation or alignment to the process. | No SE techniques are mentioned.
3. Process Reflection | The SE process is clearly explained, with a thoughtful reflection on its strengths and weaknesses. The benefits for the SE role are highlighted, and specific improvement suggestions are provided. | The SE process is explained, with a reasonable reflection on strengths and weaknesses. Benefits for the SE role are noted, and some improvement suggestions are made. | The SE process is described, but the reflection is limited. Benefits and improvement suggestions are vague or underdeveloped. | The SE process is partially described, with little or no reflection, and minimal mention of benefits or improvements. | No reflection or explanation of the SE process is provided.
4. Expectations & Conclusion (Expec/Conc) | Initial expectations regarding SE are clearly stated. A thoughtful reflection on these expectations is provided, and the conclusion effectively summarizes the essay. | Expectations are stated, with a basic reflection. The conclusion summarizes the essay adequately. | Expectations are stated, but the reflection is superficial. The conclusion lacks clarity or completeness. | Expectations are mentioned, but there is no reflection, and the conclusion is weak or missing. | No expectations or conclusion are presented.`;
            setLocalRubric(exampleRubric);
          }}>Click here to see an example rubric</p>
          <textarea
            className="rubric-input"
            value={localRubric}
            onChange={e => setLocalRubric(e.target.value)}
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
                if (localRubric.trim() !== '') {
                  setRubricContent(localRubric);
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
