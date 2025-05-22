import React from 'react';
import { IconList, IconAlignJustified, IconTextSize, IconTextCaption } from './icons';
import './Chat.css';

const AssessmentSettingsSection = ({
  assessmentType,
  setAssessmentType,
  assessmentLength,
  setAssessmentLength,
}) => (
  <div className="assessment-settings-section">
    <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <IconTextCaption size={20} style={{ marginRight: 4, color: '#3775a9' }} />
      Assessment Settings
    </h4>
    <div className="assessment-settings">
      <div className="settings-row">
        <label htmlFor="assessment-type">Assessment Format:</label>
        <div className="settings-options large-icon-selectors">
          <div
            className={`icon-select-btn${assessmentType === 'flow' ? ' selected' : ''}`}
            role="button"
            tabIndex={0}

            aria-label="Flow Text"
            onClick={() => setAssessmentType('flow')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAssessmentType('flow')}
          >
            <IconAlignJustified size={44} style={{ color: assessmentType === 'flow' ? '#4285f4' : '#b0b0b0', transition: 'color 0.18s' }} />
            <span className="icon-label">Flow Text</span>
          </div>
          <div
            className={`icon-select-btn${assessmentType === 'bullets' ? ' selected' : ''}`}
            role="button"
            tabIndex={0}

            aria-label="Bullet Points"
            onClick={() => setAssessmentType('bullets')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAssessmentType('bullets')}
          >
            <IconList size={44} style={{ color: assessmentType === 'bullets' ? '#4285f4' : '#b0b0b0', transition: 'color 0.18s' }} />
            <span className="icon-label">Bullet Points</span>
          </div>
        </div>
      </div>
      <div className="settings-row">
        <label htmlFor="assessment-length">Assessment Length:</label>
        <div className="settings-options large-icon-selectors">
          <div
            className={`icon-select-btn${assessmentLength === 'long' ? ' selected' : ''}`}
            role="button"
            tabIndex={0}

            aria-label="Long"
            onClick={() => setAssessmentLength('long')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAssessmentLength('long')}
          >
            <IconTextSize size={44} style={{ color: assessmentLength === 'long' ? '#4285f4' : '#b0b0b0', transition: 'color 0.18s' }} />
            <span className="icon-label">Long</span>
          </div>
          <div
            className={`icon-select-btn${assessmentLength === 'medium' ? ' selected' : ''}`}
            role="button"
            tabIndex={0}

            aria-label="Medium"
            onClick={() => setAssessmentLength('medium')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAssessmentLength('medium')}
          >
            <IconTextSize size={36} style={{ color: assessmentLength === 'medium' ? '#4285f4' : '#b0b0b0', transition: 'color 0.18s' }} />
            <span className="icon-label">Medium</span>
          </div>
          <div
            className={`icon-select-btn${assessmentLength === 'short' ? ' selected' : ''}`}
            role="button"
            tabIndex={0}

            aria-label="Short"
            onClick={() => setAssessmentLength('short')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setAssessmentLength('short')}
          >
            <IconTextSize size={28} style={{ color: assessmentLength === 'short' ? '#4285f4' : '#b0b0b0', transition: 'color 0.18s' }} />
            <span className="icon-label">Short</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AssessmentSettingsSection;
