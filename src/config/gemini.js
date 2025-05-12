// Google Gemini API configuration
const geminiConfig = {
  apiKey: process.env.REACT_APP_GEMINI_API_KEY,
  // Default model to use - using the fully qualified model name
  // Using Gemini 2.0 Flash for higher free token limits
  model: 'models/gemini-2.0-flash',
  // Default generation config
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  }
};

export default geminiConfig;
