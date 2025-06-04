import React from 'react';
import './OverallAssessment.css';
import { IconFileDownloadFilled, IconArrowLeft } from './icons';

import { useState } from 'react';

const OverallAssessment = ({
  overallAssessment,
  criteriaAssessments,
  teacherScores,
  restartGrading,
  setGradingComplete,
  onAssessmentChange // optional callback
}) => {
  const [strengths, setStrengths] = useState(overallAssessment?.strengths || '');
  const [improvements, setImprovements] = useState(overallAssessment?.improvements || '');
  const [advice, setAdvice] = useState(overallAssessment?.advice || '');
  const [overallGrade, setOverallGrade] = useState(overallAssessment?.overallGrade || '');

  if (!overallAssessment) {
    return (
      <div className="loading-container">
        <p>Generating overall assessment...</p>
      </div>
    );
  }


  // --- Export to PDF handler ---
  const handleExportPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 56;
      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Assessment', 40, y);
      y += 38;
      // Grade
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Overall Grade:', 40, y);
      doc.setFontSize(32);
      doc.setTextColor(25, 118, 210);
      doc.text(String(overallGrade || '-'), 170, y + 6);
      doc.setTextColor(33, 33, 33);
      y += 38;
      // Strengths
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Strengths', 40, y);
      y += 22;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(strengths || '-', 56, y, { maxWidth: 480 });
      y += Math.max(32, doc.splitTextToSize(strengths || '-', 480).length * 16) + 10;
      // Areas for Improvement
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Areas for Improvement', 40, y);
      y += 22;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(improvements || '-', 56, y, { maxWidth: 480 });
      y += Math.max(32, doc.splitTextToSize(improvements || '-', 480).length * 16) + 10;
      // Advice for Student
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Advice for Student', 40, y);
      y += 22;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(advice || '-', 56, y, { maxWidth: 480 });
      // Save
      doc.save('Assessment_Feedback.pdf');
    });
  };

  return (
    <div className="overall-assessment-container">
      <h2>Grading Complete</h2>
      
      <div className="assessment-summary">
        <div className="assessment-section strengths-section">
          <h3>Strengths</h3>
          <textarea
            value={strengths}
            onChange={e => { setStrengths(e.target.value); }}
            rows={6}
            className="editable-textarea"
          />
        </div>
        <div className="assessment-section improvements-section">
          <h3>Areas for Improvement</h3>
          <textarea
            value={improvements}
            onChange={e => { setImprovements(e.target.value); }}
            rows={6}
            className="editable-textarea"
          />
        </div>
        <div className="assessment-section grade-section">
          <h3>Overall Grade</h3>
          <div className="grade-value-wrapper">
            <input
              type="text"
              value={overallGrade}
              onChange={e => { setOverallGrade(e.target.value); }}
              className="final-grade editable-field"
            />
          </div>
        </div>
        <div className="assessment-section advice-section">
          <h3>Advice for Student</h3>
          <textarea
            value={advice}
            onChange={e => { setAdvice(e.target.value); }}
            rows={6}
            className="editable-textarea"
          />
        </div>
      </div>
      <button className="export-pdf-button" onClick={handleExportPDF}>
  <span className="export-pdf-content">
    <IconFileDownloadFilled size={20} style={{marginRight: 8, verticalAlign: 'middle'}} />
    <span>Export Feedback</span>
  </span>
</button>
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
          className="close-button"
          onClick={() => setGradingComplete(false)}
        >
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <IconArrowLeft size={20} style={{marginRight: 4}} />
            <span>Back to Criterions</span>
          </span>
        </button>
        <button 
          className="restart-button"
          onClick={restartGrading}
        >
          Grade Again
        </button>
      </div>
    </div>
  );
};

export default OverallAssessment;
