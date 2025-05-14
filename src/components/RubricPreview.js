import React, { useEffect, useState } from 'react';
import geminiService from '../services/geminiService';
import './RubricPreview.css';
import { IconList } from './icons';

const RubricPreview = ({ rubricContent, startGrading }) => {
  const [criteria, setCriteria] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const parseRubric = async () => {
      setError(null);
      setLoading(true);
      if (!rubricContent) {
        setCriteria(null);
        setLoading(false);
        return;
      }
      try {
        const parsed = await geminiService.extractRubricCriteria(rubricContent);
        if (isMounted) setCriteria(parsed);
      } catch (err) {
        setCriteria(null);
        setError('Could not parse rubric into a table. Showing plain text.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    parseRubric();
    return () => { isMounted = false; };
  }, [rubricContent]);

  return (
    <div className="rubric-preview-main">
      <h3>Current Rubric:</h3>
      {loading ? (
        <div className="rubric-loading-spinner">
          <div className="spinner" />
          <div className="rubric-loading-text">Analyzing rubric...</div>
        </div>
      ) : criteria && Array.isArray(criteria) && criteria.length > 0 ? (
        <div className="rubric-table-wrapper">
          <table className="rubric-table modern">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Score Range</th>
                <th>Description / Levels</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map(criterion => (
                <tr key={criterion.id || criterion.name || criterion.title}>
                  <td><b>{criterion.name || criterion.title}</b></td>
                  <td>{
  typeof criterion.scoreRange === 'object' && criterion.scoreRange !== null
    ? `${criterion.scoreRange.min} - ${criterion.scoreRange.max}`
    : typeof criterion.scoreRange === 'string'
      ? criterion.scoreRange
      : (criterion.levels && criterion.levels.length
        ? `${Math.min(...criterion.levels.map(l => l.score))} - ${Math.max(...criterion.levels.map(l => l.score))}`
        : '')
}</td>
                  <td>
                    {criterion.levels && Array.isArray(criterion.levels) ? (
                      <ul className="rubric-levels-list">
                        {criterion.levels.map((level, idx) => (
                          <li key={idx}>
                            <b>Score {level.score}:</b> {level.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span>{criterion.description || ''}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {error && <div className="rubric-parse-error">{error}</div>}
          <pre className="rubric-content-preview">{rubricContent}</pre>
        </>
      )}
      <div className="start-grading-container">
        <button 
          className="start-grading-button prominent"
          onClick={startGrading}
          aria-label="Start Grading"
        >
          <IconList size={22} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          <span style={{ verticalAlign: 'middle', fontWeight: 600 }}>Start Grading</span>
        </button>
      </div>
    </div>
  );
};

export default RubricPreview;
