import { useState } from 'react';
import { Worker } from '@react-pdf-viewer/core';
import { Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import Chat from './components/Chat';
import './App.css';

function App() {
  // Create new plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // PDF file state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState('');

  // Handle file onChange event
  const allowedFiles = ['application/pdf'];
  const handleFile = (e) => {
    let selectedFile = e.target.files[0];
    if (selectedFile) {
      if (allowedFiles.includes(selectedFile.type)) {
        let reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = (e) => {
          setPdfError('');
          setPdfFile(e.target.result);
        }
      } else {
        setPdfError('Not a valid PDF: Please select only PDF');
        setPdfFile('');
      }
    } else {
      console.log('Please select a PDF');
    }
  }

  return (
    <div className="container">
      {/* Upload PDF */}
      <div className="upload-container">
        <label className="upload-button">
          <input
            type="file"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          {pdfFile ? 'Choose Another PDF' : 'Upload PDF'}
        </label>
        {pdfError && <div className="error-message">{pdfError}</div>}
      </div>

      {/* Main content area */}
      <div className="content-container">
        {/* PDF Viewer */}
        <div className="viewer-container">
          {pdfFile ? (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfFile}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          ) : (
            <div className="no-pdf">No file is selected yet</div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="chat-wrapper">
          <Chat />
        </div>
      </div>
    </div>
  );
}

export default App;
