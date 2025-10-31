# Essay Grader

An interactive essay grading application that provides AI-assisted feedback and grading for written assignments. This Electron-based desktop application allows educators to upload student essays in PDF format, automatically grade them using AI, and provide detailed feedback with highlighted evidence from the text.

## ✨ Features

- **PDF Upload & Viewing**: Upload and view student essays in PDF format
- **AI-Powered Grading**: Automatic grading using AI with configurable rubrics
- **Interactive Feedback**: Highlight and annotate specific sections of the essay
- **Rubric Management**: Create and manage custom grading rubrics
- **Evidence-Based**: AI provides evidence for grades with direct references to the text
- **Cross-Platform**: Works on Windows and macOS

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or Yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/johentschel23-ux/essay-grader.git
   cd essay-grader
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with your API keys:
   ```
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
   ```

### Running the Application

#### Development Mode
```bash
# Start the development server
npm start

# In a separate terminal, start Electron
npm run electron:dev
```

#### Production Build
```bash
# Create a production build
npm run build

# Package the application for your platform
npm run package
```

## 🛠 Project Structure

```
essay-grader/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   ├── config/          # Configuration files
│   ├── services/        # API and service integrations
│   ├── utils/           # Utility functions
│   ├── App.js           # Main application component
│   └── index.js         # Application entry point
├── main.js              # Electron main process
└── preload.js           # Electron preload script
```

## 📚 Documentation

### Key Components

- **AdvancedPdfViewer**: Handles PDF rendering and text highlighting
- **RubricModal**: Manages rubric creation and editing
- **GeminiService**: Handles AI-powered grading and feedback
- **Database**: SQLite database for storing grades and rubrics

### Database Schema

The application uses SQLite with the following main tables:
- `grades`: Stores grading data
- `rubrics`: Contains rubric definitions
- `feedback`: Stores feedback and annotations
