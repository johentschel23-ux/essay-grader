// Google Gemini API configuration
// Google Gemini API configuration for @google/genai
const geminiConfig = {
  apiKey: process.env.REACT_APP_GEMINI_API_KEY,
  // Use the model name as required by the new SDK (no 'models/' prefix)
  model: 'gemini-2.0-flash',
  // Default generation config (can be passed to generateContent)
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
  }
};

export default geminiConfig;
