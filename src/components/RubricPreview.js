import React, { useEffect, useState } from 'react';
import geminiService from '../services/geminiService';
import './RubricPreview.css';
import { IconList } from './icons';

/**
 * @param {Object} props
 * @param {string} props.rubricContent - The rubric text
 * @param {Function} props.startGrading - Callback to start grading
 * @param {Function} [props.onReviseRubric] - Optional callback to open rubric editor
 */
/**
 * @param {Object} props
 * @param {string} props.rubricContent - The rubric text
 * @param {Function} props.startGrading - Callback to start grading
 * @param {Function} [props.onReviseRubric] - Optional callback to open rubric editor
 * @param {boolean} [props.pdfUploaded] - True if a PDF is uploaded and ready
 */
const RubricPreview = ({ rubricContent, startGrading, onReviseRubric, pdfUploaded }) => {
  const [criteria, setCriteria] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Validate rubric structure
  function validateCriteria(criteria) {
    if (!Array.isArray(criteria) || criteria.length === 0) return 'No criteria found.';
    // Special check: LLM fallback or default output for malformed rubric
    if (
      criteria.length === 1 &&
      (criteria[0].name === 'Overall' || criteria[0].title === 'Overall') &&
      Array.isArray(criteria[0].levels) &&
      criteria[0].levels.length === 1 &&
      criteria[0].levels[0].description &&
      /no information provided in the grading rubric/i.test(criteria[0].levels[0].description)
    ) {
      return 'Rubric could not be parsed. Please check your rubric format.';
    }
    for (const criterion of criteria) {
      if (!criterion.name && !criterion.title) return 'A criterion is missing a name/title.';
      if (!criterion.levels && !criterion.scoreRange) return `Criterion "${criterion.name || criterion.title || '?'}" is missing levels or score range.`;
      if (criterion.levels && Array.isArray(criterion.levels)) {
        for (const level of criterion.levels) {
          if (typeof level.score === 'undefined' || !level.description) {
            return `A level in "${criterion.name || criterion.title || '?'}" is missing a score or description.`;
          }
        }
      }
    }
    return null;
  }

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
        if (parsed === 'NO_VALID_RUBRIC') {
          setCriteria(null);
          setError('No valid rubric detected. Please check your rubric and try again.');
        } else {
          // Validate structure
          const validationError = validateCriteria(parsed);
          if (validationError) {
            setCriteria(null);
            setError(`Rubric error: ${validationError}`);
          } else if (isMounted) {
            setCriteria(parsed);
          }
        }
      } catch (err) {
        setCriteria(null);
        if (err && err.message === 'MODEL_OVERLOADED') {
          setError('The Gemini API is overloaded. Please try again in a few minutes.');
        } else {
          setError('Failed to extract rubric. Please check your rubric format or try again later.');
        }
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
          {error ? (
            <>
              <div className="rubric-parse-error styled-error">
                <div className="rubric-error-message">{error}</div>
                <div className="rubric-error-actions">
                  <button className="rubric-revise-btn" onClick={onReviseRubric}>
                    Revise Rubric
                  </button>
                </div>
                <div className="rubric-error-hint">Please check your rubric format and try again.</div>
              </div>
              <pre className="rubric-content-preview">{rubricContent}</pre>
            </>
          ) : (
            <pre className="rubric-content-preview">{rubricContent}</pre>
          )}
        </>
      )} 
      <div className="start-grading-container">
        <button 
          className={`start-grading-button prominent${(loading || error || !pdfUploaded) ? ' disabled' : ''}`}
          onClick={loading || error || !pdfUploaded ? undefined : startGrading}
          aria-label={
            loading ? 'Waiting for rubric' :
            error ? 'Rubric error' :
            !pdfUploaded ? 'Upload PDF to start grading' :
            'Start Grading'}
          disabled={loading || !!error || !pdfUploaded}
          style={(loading || error || !pdfUploaded) ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          <IconList size={22} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          <span style={{ verticalAlign: 'middle', fontWeight: 600 }}>
            {loading ? 'Waiting for rubric...' :
              error ? 'Fix rubric to continue' :
              !pdfUploaded ? 'Upload PDF to start grading' :
              'Start Grading'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default RubricPreview;
