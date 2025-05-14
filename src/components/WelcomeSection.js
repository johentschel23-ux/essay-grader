import React from 'react';
import { IconTextCaption, IconList, IconTextSize } from './icons';
import './Chat.css';

const WelcomeSection = ({ onAddRubric }) => (
  <div className="welcome-center-wrapper">
    <div className="welcome-message">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <IconTextCaption size={44} style={{ color: '#4285f4', marginRight: 14 }} />
        <IconList size={44} style={{ color: '#34a853', marginRight: 14 }} />
        <IconTextSize size={44} style={{ color: '#fbbc05' }} />
      </div>
      <h3>Welcome to the Interactive Rubric Grader</h3>
      <p style={{ fontSize: '1.12em', color: '#444', margin: '18px 0 12px 0' }}>
        Effortlessly assess essays using AI-powered rubric grading.<br />
        Highlight evidence, select assessment styles, and generate rich feedback.
      </p>
      <ul className="instruction-list">
        <li>
          <b>1.</b> <span>Upload a PDF essay to begin.</span>
        </li>
        <li>
          <b>2.</b> <span>Add or edit your grading rubric.</span>
        </li>
        <li>
          <b>3.</b> <span>Choose assessment style and length.</span>
        </li>
        <li>
          <b>4.</b> <span>Start interactive grading and view AI suggestions.</span>
        </li>
      </ul>
      <button className="add-rubric-button" onClick={onAddRubric}>
        + Add Grading Rubric
      </button>
    </div>
  </div>
);

export default WelcomeSection;
