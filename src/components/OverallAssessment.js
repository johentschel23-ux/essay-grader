import React from 'react';
import './OverallAssessment.css';

const OverallAssessment = ({
  overallAssessment,
  criteriaAssessments,
  teacherScores,
  restartGrading,
  setGradingComplete
}) => {
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

export default OverallAssessment;
