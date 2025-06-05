import React from 'react';
import './EvidenceSection.css';

const EvidenceSection = ({
  showEvidence,
  setShowEvidence,
  currentAssessment,
  hoveredEvidenceIndex,
  setHoveredEvidenceIndex,
  hoveredAssessmentIndexes,
  setHoveredAssessmentIndexes
}) => {
  return (
    <div className="evidence-section">
      {!showEvidence ? (
        <button
          className="show-evidence-btn"
          onClick={() => setShowEvidence(true)}
          aria-label="Show supporting evidence from the essay"
          title="View essay quotes that support this assessment"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{verticalAlign:'middle',marginRight:6}} xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="14" height="12" rx="2" fill="#e3f2fd" stroke="#1976d2" strokeWidth="1.3"/>
            <rect x="6" y="7" width="8" height="2" rx="1" fill="#1976d2"/>
            <rect x="6" y="11" width="5" height="2" rx="1" fill="#90caf9"/>
          </svg>
          Show Supporting Evidence
        </button>
      ) : (
        <div className="evidence-container">
          <h4>Evidence from Essay</h4>
          {Array.isArray(currentAssessment.evidence) && currentAssessment.evidence.length > 0 ? (
            currentAssessment.evidence.map((item, index) => {
              const quote = item.highlight || item.quote || 'No quote available';
              const isEvidenceHovered = hoveredEvidenceIndex === index;
              return (
                <div
                  key={index}
                  className={`evidence-item${isEvidenceHovered ? ' evidence-highlight' : ''}`}
                  onMouseEnter={() => {
                    setHoveredEvidenceIndex(index);
                    setHoveredAssessmentIndexes(item.relatedAssessmentIndexes || []);
                  }}
                  onMouseLeave={() => {
                    setHoveredEvidenceIndex(null);
                    setHoveredAssessmentIndexes([]);
                  }}
                >
                  <div className="evidence-location">
                    <span className="evidence-page">{item.page || item.paragraph || 'N/A'}</span>
                  </div>
                  <blockquote className="evidence-quote">"{quote}"</blockquote>
                  {item.context && <div className="evidence-context">Context: {item.context}</div>}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="evidence-keywords">
                      <small>Key terms: {item.keywords.join(', ')}</small>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="evidence-not-found-warning">
              <p>No evidence quotes available for this criterion.</p>
            </div>
          )}
          <button
            className="hide-evidence-button"
            onClick={() => setShowEvidence(false)}
          >
            Hide Evidence
          </button>
        </div>
      )}
    </div>
  );
};

export default EvidenceSection;
