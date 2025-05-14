import { GoogleGenerativeAI } from '@google/generative-ai';
import geminiConfig from '../config/gemini.js';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

/**
 * Get a response from the Gemini API
 * @param {string} prompt - The prompt to send to the API
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The generated response
 * @throws {Error} - Throws an error if the API call fails with specific error types
 */
export const getGeminiResponse = async (prompt, options = {}) => {
  try {
    // If no API key is provided, return an error message
    if (!geminiConfig.apiKey) {
      console.error('Gemini API key is not set. Please set the REACT_APP_GEMINI_API_KEY environment variable.');
      throw new Error('API key not configured. Please set up your Gemini API key.');
    }

    // Truncate very long prompts to avoid excessive token usage
    // Gemini 2.0 Flash has a larger context window, so we can use a higher limit
    const maxPromptLength = options.maxPromptLength || 20000; // Default to 20k chars for 2.0 Flash
    const truncatedPrompt = prompt.length > maxPromptLength ? 
      prompt.substring(0, maxPromptLength) + '... [Content truncated to reduce token usage]' : 
      prompt;

    // Log the prompt being sent to the LLM
    console.log('===== SENDING PROMPT TO LLM =====');
    console.log(truncatedPrompt);
    console.log('=================================');

    // Get the model
    const model = genAI.getGenerativeModel({
      model: options.model || geminiConfig.model,
      generationConfig: {
        ...geminiConfig.generationConfig,
        ...options.generationConfig
      }
    });

    // Generate content
    const result = await model.generateContent(truncatedPrompt);
    const response = result.response;
    const responseText = response.text();
    
    // Log the response from the LLM
    console.log('===== LLM RESPONSE =====');
    console.log(responseText);
    console.log('========================');
    
    return responseText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Handle specific error types
    if (error.message && error.message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Your Google Gemini API quota has been reached. Please try again later or upgrade your API plan.');
    } else if (error.message && error.message.includes('PERMISSION_DENIED')) {
      throw new Error('API access denied. Please check your API key and permissions.');
    } else if (error.message && error.message.includes('INVALID_ARGUMENT')) {
      throw new Error('Invalid request. The prompt may be too long or contain invalid content.');
    } else {
      throw new Error(`Error calling Gemini API: ${error.message}`);
    }
  }
};

/**
 * Extract criteria from a rubric
 * @param {string} rubricContent - The rubric content
 * @returns {Promise<Array>} - Array of criteria objects
 */
export const extractRubricCriteria = async (rubricContent) => {
  const prompt = `
    Analyze the following grading rubric and extract each criterion.
    For each criterion, identify:
    1. The name/title of the criterion
    2. The possible score range (e.g., 1-5)
    3. The description for each score level
    
    RUBRIC:
    ${rubricContent}
    
    FORMAT YOUR RESPONSE AS A VALID JSON ARRAY with objects containing:
    {
      "id": number,
      "name": "criterion name",
      "scoreRange": { "min": number, "max": number },
      "levels": [
        { "score": number, "description": "description for this score level" },
        ...
      ]
    }
    
    DO NOT include any explanatory text before or after the JSON array.
    ONLY return the JSON array and nothing else.
  `;
  
  const mergedOptions = {
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };
  
  try {
    const response = await getGeminiResponse(prompt, mergedOptions);
    
    // Clean up the response to ensure it's valid JSON
    let cleanedResponse = response.trim();
    
    // Remove any markdown code block markers
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    
    // Remove any text before the first [ and after the last ]
    const firstBracket = cleanedResponse.indexOf('[');
    const lastBracket = cleanedResponse.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanedResponse = cleanedResponse.substring(firstBracket, lastBracket + 1);
    }
    
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error extracting rubric criteria:', error);
    throw new Error('Failed to parse rubric. Please check the format and try again.');
  }
};

/**
 * Grade a single criterion from a rubric
 * @param {string} essayContent - The content of the essay
 * @param {object} criterion - The criterion object
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<object>} - The assessment for this criterion
 */
export const gradeSingleCriterion = async (essayContent, criterion, options = {}) => {
  // Settings for assessment format and length
  const assessmentType = options.assessmentType || 'flow';
  const assessmentLength = options.assessmentLength || 'long';

  let justificationInstruction = '';
  let justificationSchema = '';
  if (assessmentType === 'bullets') {
    justificationInstruction = 'Present your justification as bullet points. Return the justification as a JSON array of strings, where each string is a bullet point.';
    justificationSchema = '"justification": ["bullet point 1", "bullet point 2", ...],';
  } else {
    justificationInstruction = 'Present your justification as a coherent paragraph. Return the justification as a single string.';
    justificationSchema = '"justification": "Your detailed justification without revealing the exact score",';
  }

  // New instructions to relate evidence to justification
  const relateInstruction = `\nFor each evidence quote, indicate which sentences or bullet points from your justification it supports. Return the indexes (starting from 0) as a field \"relatedAssessmentIndexes\" in each evidence object. If the justification is a paragraph, treat each sentence as a unit (split on periods, exclamation marks, or question marks). If it's a list, use each bullet as a unit.`;

  let lengthInstruction = '';
  if (assessmentLength === 'short') {
    lengthInstruction = 'Be concise and brief.';
  } else if (assessmentLength === 'medium') {
    lengthInstruction = 'Be balanced in detail and length.';
  } else {
    lengthInstruction = 'Be detailed and extended.';
  }

  const prompt = `
    You are an expert essay grader. Grade the following essay based on a single criterion from a rubric.
    
    CRITERION: ${criterion.name}
    SCORE RANGE: ${criterion.scoreRange.min} to ${criterion.scoreRange.max}
    
    ESSAY:
    ${essayContent}
    
    Provide the following in your response:
    1. A justification for your assessment (without revealing the exact score). ${justificationInstruction} ${lengthInstruction}
    2. At least 3 specific quotes from the essay that support your assessment
    3. For each quote, indicate which sentences or bullet points from your justification it supports. ${relateInstruction}
    4. Your numerical score (${criterion.scoreRange.min}-${criterion.scoreRange.max})
    
    FORMAT YOUR RESPONSE AS A VALID JSON object:
    {
      ${justificationSchema}
      "evidence": [
        { 
          "quote": "exact quote from essay", 
          "paragraph": "paragraph number or location",
          "relatedAssessmentIndexes": [array of integers, optional]
        },
        ...
      ],
      "score": number
    }
    
    DO NOT include any explanatory text before or after the JSON object.
    ONLY return the JSON object and nothing else.
  `;
  
  const mergedOptions = {
    ...options,
    generationConfig: {
      ...(options.generationConfig || {}),
      temperature: 0.2,
      maxOutputTokens: 1024
    }
  };
  
  try {
    const response = await getGeminiResponse(prompt, mergedOptions);
    
    // Clean up the response to ensure it's valid JSON
    let cleanedResponse = response.trim();
    
    // Remove any markdown code block markers
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    
    // Remove any text before the first { and after the last }
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error grading criterion:', error);
    return {
      justification: "There was an error processing this criterion. Please try again.",
      evidence: [],
      score: null
    };
  }
};

/**
 * Generate an overall assessment based on criterion scores
 * @param {string} essayContent - The content of the essay
 * @param {Array} criteriaWithScores - Array of criteria with scores
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<object>} - The overall assessment
 */
export const generateOverallAssessment = async (essayContent, criteriaWithScores, options = {}) => {
  // Settings for assessment format and length
  const assessmentType = options.assessmentType || 'flow';
  const assessmentLength = options.assessmentLength || 'long';

  let strengthsInstruction = '';
  let improvementsInstruction = '';
  if (assessmentType === 'bullets') {
    strengthsInstruction = 'Present strengths as bullet points.';
    improvementsInstruction = 'Present areas for improvement as bullet points.';
  } else {
    strengthsInstruction = 'Present strengths as a coherent paragraph.';
    improvementsInstruction = 'Present areas for improvement as a coherent paragraph.';
  }

  let lengthInstruction = '';
  if (assessmentLength === 'short') {
    lengthInstruction = 'Be concise and brief.';
  } else if (assessmentLength === 'medium') {
    lengthInstruction = 'Be balanced in detail and length.';
  } else {
    lengthInstruction = 'Be detailed and extended.';
  }

  const criteriaText = criteriaWithScores.map(c => 
    `${c.name}: Score ${c.teacherScore || c.aiScore} out of ${c.scoreRange.max}`
  ).join('\n');
  
  const prompt = `
    You are an expert essay grader. Given the following essay and the scores for each criterion, provide an overall assessment. 
    Summarize the essay's strengths and areas for improvement. 
    Then, generate a final grade on a 0-10 scale (with decimals allowed), where the individual criterion scores are on their own scales (typically 1-5). 
    The final grade should reflect the average performance across all criteria, converted to a 10-point scale.

    ${strengthsInstruction} ${improvementsInstruction} ${lengthInstruction}
    
    ESSAY:
    ${essayContent}
    
    CRITERIA & SCORES:
    ${criteriaText}
    
    FORMAT YOUR RESPONSE AS A VALID JSON OBJECT with the following keys:
    {
      "strengths": string,
      "improvements": string,
      "overallGrade": number, // final grade on a 0-10 scale (decimals allowed)
      "advice": string
    }
  `;
  
  const mergedOptions = {
    ...options,
    generationConfig: {
      ...(options.generationConfig || {}),
      temperature: 0.3,
      maxOutputTokens: 1024
    }
  };
  
  try {
    const response = await getGeminiResponse(prompt, mergedOptions);
    
    try {
      let cleanedResponse = response.trim();
      // Remove markdown code block markers if present
      cleanedResponse = cleanedResponse.replace(/^```json|^```js|^```javascript|^```/gi, '');
      cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
      const firstBrace = cleanedResponse.indexOf('{');
      const lastBrace = cleanedResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
      }
      let assessment = JSON.parse(cleanedResponse);

      // --- Enforce local final grade calculation on a 10-point scale ---
      // Use teacherScore if available, otherwise aiScore
      const scores = criteriaWithScores.map(c => {
        let score = c.teacherScore != null ? Number(c.teacherScore) : Number(c.aiScore);
        let max = c.scoreRange && c.scoreRange.max ? Number(c.scoreRange.max) : 5;
        // Default to 5 if not specified
        return {score, max};
      }).filter(s => !isNaN(s.score) && !isNaN(s.max) && s.max > 0);
      if (scores.length > 0) {
        const avgRatio = scores.reduce((sum, s) => sum + (s.score / s.max), 0) / scores.length;
        const finalGrade10 = Math.round(avgRatio * 10 * 100) / 100; // round to 2 decimals
        assessment.overallGrade = finalGrade10;
      } else {
        assessment.overallGrade = "N/A";
      }
      return assessment;
    } catch (error) {
      console.error('Error generating overall assessment:', error);
      return {
        strengths: "There was an error generating the overall assessment.",
        improvements: "Please review the individual criteria scores.",
        overallGrade: "N/A",
        advice: "Consider reviewing each criterion individually."
      };
    }
  } catch (error) {
    console.error('Error generating overall assessment:', error);
    return {
      strengths: "There was an error generating the overall assessment.",
      improvements: "Please review the individual criteria scores.",
      overallGrade: "N/A",
      advice: "Consider reviewing each criterion individually."
    };
  }
};

/**
 * Revise the AI's score for a criterion based on edited justification text.
 * @param {string} essayContent - The content of the essay
 * @param {object} criterion - The criterion object
 * @param {string} originalJustification - The original justification from the LLM
 * @param {string} editedJustification - The edited justification provided by the user
 * @param {number} originalScore - The original AI-generated score
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<object>} - { revisedScore: number, rationale: string }
 */
export const reviseCriterionScoreWithJustification = async (
  essayContent,
  criterion,
  originalJustification,
  editedJustification,
  originalScore,
  options = {}
) => {
  const prompt = `
    You are an expert essay grader. The following is an essay, a rubric criterion, and two versions of the justification for the assessment of this criterion: the original justification (from an AI) and an edited justification (from a human reviewer). The original numerical score was ${originalScore}.

    Please carefully consider the edited justification. If the edits suggest a different score is warranted, revise the score accordingly. Otherwise, keep the original score. Provide a brief rationale for your decision.

    ESSAY:
    ${essayContent}

    CRITERION: ${criterion.name}
    SCORE RANGE: ${criterion.scoreRange.min} to ${criterion.scoreRange.max}

    ORIGINAL JUSTIFICATION:
    ${originalJustification}

    EDITED JUSTIFICATION:
    ${editedJustification}

    ORIGINAL SCORE: ${originalScore}

    FORMAT YOUR RESPONSE AS A VALID JSON object:
    {
      "revisedScore": number, // the new score (or the original if unchanged)
      "rationale": "A brief explanation for your decision"
    }

    DO NOT include any explanatory text before or after the JSON object.
    ONLY return the JSON object and nothing else.
  `;

  const mergedOptions = {
    ...options,
    generationConfig: {
      ...(options.generationConfig || {}),
      temperature: 0.2,
      maxOutputTokens: 512
    }
  };

  try {
    const response = await getGeminiResponse(prompt, mergedOptions);
    let cleanedResponse = response.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error revising criterion score:', error);
    return {
      revisedScore: originalScore,
      rationale: 'There was an error revising the score. The original score is retained.'
    };
  }
};

// Create a named export object
const geminiService = {
  getGeminiResponse,

  extractRubricCriteria,
  gradeSingleCriterion,
  generateOverallAssessment,
  reviseCriterionScoreWithJustification
};

export default geminiService;
