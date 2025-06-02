
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import PropTypes from 'prop-types'; // Moved to the top
import 'react-pdf-highlighter/dist/style.css';
import './AdvancedPdfViewer.css'; // Keep your custom styles

// Determine if running in Electron
const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);

let workerSrcValue;

if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getPdfWorkerPath === 'function') {
  // Use the robust Electron preload path
  workerSrcValue = window.electronAPI.getPdfWorkerPath('mjs');
} else if (isElectron) {
  if (process.env.NODE_ENV === 'development') {
    workerSrcValue = '/pdf.worker.min.mjs';
  } else {
    workerSrcValue = '../pdf.worker.min.mjs';
  }
} else {
  workerSrcValue = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

pdfjs.GlobalWorkerOptions.workerSrc = workerSrcValue;

// Helper to generate unique IDs for highlights
const getNextId = () => String(Math.random()).slice(2);

// Simple spinner component
const Spinner = () => (
  <div className="pdf-spinner" role="status" aria-live="polite">
    <span className="spinner-icon" aria-hidden="true" />
    Loading PDF...
  </div>
);

const AdvancedPdfViewer = ({ url }) => {
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [scale, setScale] = React.useState(1.0);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber(prev => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  }

  function zoomIn() {
    setScale(s => Math.min(s + 0.2, 3));
  }

  function zoomOut() {
    setScale(s => Math.max(s - 0.2, 0.5));
  }

  if (!url) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Please upload a PDF to view.</div>;
  }

  return (
    <div className="simple-pdf-viewer-container">
      <div className="pdf-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <button onClick={goToPrevPage} disabled={pageNumber <= 1}>Previous</button>
        <span>Page {pageNumber} of {numPages || '?'}</span>
        <button onClick={goToNextPage} disabled={numPages ? pageNumber >= numPages : true}>Next</button>
        <button onClick={zoomOut}>-</button>
        <span>Zoom: {(scale * 100).toFixed(0)}%</span>
        <button onClick={zoomIn}>+</button>
      </div>
      <div className="pdf-viewer-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div>Loading PDF...</div>}
          error={<div>Failed to load PDF.</div>}
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
};

AdvancedPdfViewer.propTypes = {
  url: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(File),
    PropTypes.instanceOf(Blob),
  ]),
};

export default AdvancedPdfViewer;