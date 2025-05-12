import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PdfLoader,
  PdfHighlighter,
  Highlight,
  Tip,
} from 'react-pdf-highlighter';
import PropTypes from 'prop-types'; // Moved to the top

// Import default styles for react-pdf-highlighter
import 'react-pdf-highlighter/dist/style.css';
import './AdvancedPdfViewer.css'; // Keep your custom styles

// Helper to generate unique IDs for highlights
const getNextId = () => String(Math.random()).slice(2);

// Simple spinner component
const Spinner = () => (
  <div className="pdf-spinner" role="status" aria-live="polite">
    <span className="spinner-icon" aria-hidden="true" />
    Loading PDF...
  </div>
);


const AdvancedPdfViewer = ({ url, evidence }) => {
  const [highlights, setHighlights] = useState([]); // Stores IHighlight objects
  const [internalFileUrl, setInternalFileUrl] = useState(null);
  const [currentEvidenceIndex, setCurrentEvidenceIndex] = useState(0);
  const [pdfDocumentLoaded, setPdfDocumentLoaded] = useState(false); // New state
  const [currentPdfDocument, setCurrentPdfDocument] = useState(null); // To hold pdfDocument from loader

  const highlighterRef = useRef(null); // To control scrolling to highlights
  const pdfDocRef = useRef(null); // Ref to hold pdfDoc from PdfLoader

  // Effect to manage the PDF file URL (create/revoke object URLs)
  useEffect(() => {
    let objectUrlCreatedInThisEffect = null;
    if (url instanceof File || url instanceof Blob) {
      objectUrlCreatedInThisEffect = URL.createObjectURL(url);
      setInternalFileUrl(objectUrlCreatedInThisEffect);
      
      setHighlights([]); // Reset highlights for new file
      setCurrentEvidenceIndex(0);
      setPdfDocumentLoaded(false); // Reset PDF loaded state
      setCurrentPdfDocument(null); // Reset pdf document
      pdfDocRef.current = null; // Reset ref
    } else if (typeof url === 'string') {
      setInternalFileUrl(url); // Assume it's a direct URL or existing blob URL
      setHighlights([]); // Reset highlights
      setCurrentEvidenceIndex(0);
      setPdfDocumentLoaded(false); // Reset PDF loaded state
      setCurrentPdfDocument(null); // Reset pdf document
      pdfDocRef.current = null; // Reset ref
    } else {
      setInternalFileUrl(null);
      setHighlights([]);
      setPdfDocumentLoaded(false);
      setCurrentPdfDocument(null);
      pdfDocRef.current = null; // Reset ref
      if (url) {
        
      }
    }

    return () => {
      if (objectUrlCreatedInThisEffect) {
        URL.revokeObjectURL(objectUrlCreatedInThisEffect);
        
      }
    };
  }, [url]);

  // Effect to process evidence and create highlights
  useEffect(() => {
    if (!evidence) {
      // If evidence is cleared, remove all highlights
      setHighlights([]);
      return;
    }

    const newHighlights = [];
    const evidenceArray = Array.isArray(evidence) ? evidence : [evidence];

    evidenceArray.forEach((ev, index) => {
      if (ev && ev.highlight && typeof ev.page === 'number') {
        newHighlights.push({
          id: ev.id || getNextId(), // Use existing ID or generate new
          content: { text: ev.highlight },
          position: {
            pageNumber: ev.page,
            // react-pdf-highlighter will calculate boundingRect via search
            boundingRect: { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 }, // Placeholder
          },
          comment: { text: ev.context || '', emoji: '' }, // Use context as comment
        });
      }
    });


    setHighlights(newHighlights);
    setCurrentEvidenceIndex(0); // Reset to first evidence when new evidence comes in
  }, [evidence]);

  // Scroll to the current highlight
  useEffect(() => {
    if (pdfDocumentLoaded && highlights.length > 0 && highlighterRef.current && currentEvidenceIndex < highlights.length) {
      const currentHighlight = highlights[currentEvidenceIndex];
      if (currentHighlight) {
        console.log('AdvancedPdfViewer: Attempting to scroll to highlight:', currentHighlight);
        try {
          highlighterRef.current.scrollTo(currentHighlight);
        } catch (e) {
          console.error("AdvancedPdfViewer: Error during scrollTo:", e, "Highlight:", currentHighlight);
        }
      }
    }
  }, [pdfDocumentLoaded, highlights, currentEvidenceIndex]); // Added pdfDocumentLoaded dependency

  // New effect to handle when pdfDocument is received from PdfLoader
  useEffect(() => {
    if (currentPdfDocument && !pdfDocumentLoaded) {
      setPdfDocumentLoaded(true);
      console.log('AdvancedPdfViewer: pdfDocument processed, setting pdfDocumentLoaded to true.');
    }
    // If url changes and pdfDocRef.current has a value (from a previous render of PdfLoader),
    // update currentPdfDocument state.
    if (url && pdfDocRef.current && currentPdfDocument !== pdfDocRef.current) {
      console.log('AdvancedPdfViewer: Syncing pdfDocRef.current to currentPdfDocument state');
      setCurrentPdfDocument(pdfDocRef.current);
    }
  }, [currentPdfDocument, pdfDocumentLoaded, url]); // Added url dependency to re-check ref

  const addHighlight = (highlight, commentText) => {
    // This function is for manual highlights, which we are not primarily using
    // but good to have the structure from the example.
    // For LLM highlights, they are set via the `evidence` prop.
    console.log('Manual highlight added (not primary use case):', highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, comment: { text: commentText, emoji: '' }, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  const updateHighlight = (highlightId, position, content, comment) => {
    setHighlights(
      highlights.map((h) =>
        h.id === highlightId
          ? {
              ...h,
              position: { ...h.position, ...position },
              content: { ...h.content, ...content },
              comment: { ...h.comment, ...comment },
            }
          : h
      )
    );
  };

  // Navigation functions
  const goToNextEvidence = () => {
    setCurrentEvidenceIndex(prev => Math.min(prev + 1, highlights.length - 1));
  };

  const goToPreviousEvidence = () => {
    setCurrentEvidenceIndex(prev => Math.max(prev - 1, 0));
  };

  if (!internalFileUrl) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Please upload a PDF to view.</div>;
  }

  return (
    <div className="advanced-pdf-viewer-container">
      {highlights.length > 0 && (
        <div className="evidence-navigation">
          <button onClick={goToPreviousEvidence} disabled={currentEvidenceIndex === 0}>
            Previous Evidence
          </button>
          <span>
            Evidence {currentEvidenceIndex + 1} of {highlights.length}
          </span>
          <button onClick={goToNextEvidence} disabled={currentEvidenceIndex === highlights.length - 1}>
            Next Evidence
          </button>
        </div>
      )}
      <div className="pdf-highlighter-wrapper">
        <PdfLoader url={internalFileUrl} beforeLoad={<Spinner />}>
          {(pdfDoc) => { // Renamed to pdfDoc to avoid confusion with state
            // This callback signifies that the PDF document object is ready
            // Assign to ref. A useEffect will handle setting it to state.
            if (pdfDoc && pdfDocRef.current !== pdfDoc) {
                console.log('AdvancedPdfViewer: PdfLoader callback - pdfDoc available, assigning to ref.');
                pdfDocRef.current = pdfDoc;
                // Trigger a re-render or let useEffect pick it up if `url` has changed, leading to this new pdfDoc
                // If setCurrentPdfDocument was called here, it would be the 'setState in render' issue.
                // Forcing a state update here if nothing else triggers the effect listening to `url`
                // This is a bit of a hack, ideally PdfLoader offers an onDocumentLoad callback.
                if (currentPdfDocument !== pdfDoc) {
                    // This will schedule an update, not run it immediately in render
                    Promise.resolve().then(() => setCurrentPdfDocument(pdfDoc));
                }
            }
            // Only render PdfHighlighter if pdfDoc (or currentPdfDocument) is available
            const displayPdfDoc = currentPdfDocument || pdfDocRef.current;
            if (!displayPdfDoc) return <Spinner />; 

            return (
              <PdfHighlighter
                ref={highlighterRef}
                pdfDocument={displayPdfDoc} // Use the received pdfDoc here
                enableAreaSelection={(event) => event.altKey} // Example: allow area selection with Alt key
                onSelectionFinished={( 
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  // This Tip is for manual highlights. For LLM highlights, they are pre-loaded.
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      addHighlight({ content, position }, comment.text || '');
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => (
                  <Highlight
                    key={highlight.id || index}
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    content={highlight.content}
                    comment={highlight.comment}
                    onClick={() => {}}
                  />
                )}
                highlights={highlights} // Pass the highlights from state (derived from LLM)
                // Key part for LLM driven highlights: search for text on a page
                searchHighlights={{ // This tells PdfHighlighter to find these highlights
                  source: 'text', // We are providing text and page number
                  highlightsToSearch: highlights.map(h => ({
                    searchQuery: h.content.text,
                    pageIndex: h.position.pageNumber -1 , // pdf.js is 0-indexed for pages
                    highlightId: h.id,
                    // Optional: provide context to disambiguate if text appears multiple times
                    // context: h.comment.text // Using comment (which holds original context) for this
                  }))
                }}
              />
            );
          }}
        </PdfLoader>
      </div>
      {/* Optional: Display list of highlights similar to the example if needed */}
      {/* <div className="highlights-list-container"> ... </div> */}
    </div>
  );
};

AdvancedPdfViewer.propTypes = {
  url: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(File),
    PropTypes.instanceOf(Blob)
  ]),
  evidence: PropTypes.arrayOf(
    PropTypes.shape({
      page: PropTypes.number.isRequired,
      highlight: PropTypes.string.isRequired,
      context: PropTypes.string
    })
  )
};

export default AdvancedPdfViewer;
