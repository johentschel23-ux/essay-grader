import { useState } from 'react';
import Chat from './components/Chat';
import './App.css';



function App() {
  // PDF file state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState('');
  
  // App state
  const [appTitle] = useState('Interactive Rubric Grader');

  // Handle file onChange event
  const handleFile = (e) => {
    let selectedFile = e.target.files[0];
    if (selectedFile) {
      const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        setPdfError('');
        // Also keep the data URL for compatibility
        let reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = (e) => {
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
      <header className="app-header">
        <h1>{appTitle}</h1>
        {/* Upload PDF */}
        <div className="upload-container">
          <label className="upload-button">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            {pdfFile ? 'Choose Another PDF' : 'Upload PDF'}
          </label>
          {pdfError && <div className="error-message">{pdfError}</div>}
        </div>
      </header>

      {/* Main content area */}
      <div className="content-container">
        <div className="app-layout">
          {/* Rubric Interface */}
          <div className="rubric-wrapper">
            <Chat 
              pdfFile={pdfFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
