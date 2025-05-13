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
 * Generate an essay summary
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The generated summary
 */
export const generateEssaySummary = async (essayContent, options = {}) => {
  const prompt = `
    Summarize the following essay in a concise manner. Focus on the main thesis, 
    key arguments, and conclusions:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Generate an essay grade with explanation
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The generated grade with explanation
 */
export const generateEssayGrade = async (essayContent, options = {}) => {
  const prompt = `
    Grade the following essay on a scale from A+ to F. Provide a brief explanation
    for the grade, highlighting strengths and areas for improvement:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Generate detailed feedback for an essay
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The generated detailed feedback
 */
export const generateEssayFeedback = async (essayContent, options = {}) => {
  const prompt = `
    Provide detailed feedback for the following essay. Include analysis of structure,
    argument quality, evidence usage, and writing style:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Identify the strengths of an essay
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The identified strengths
 */
export const identifyEssayStrengths = async (essayContent, options = {}) => {
  const prompt = `
    Identify and list the main strengths of the following essay. Focus on aspects
    such as argument quality, structure, evidence, and writing style:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Identify areas for improvement in an essay
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The identified areas for improvement
 */
export const identifyEssayImprovements = async (essayContent, options = {}) => {
  const prompt = `
    Identify and list the main areas for improvement in the following essay. Focus on
    aspects such as argument quality, structure, evidence, and writing style:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Analyze the clarity and structure of an essay
 * @param {string} essayContent - The content of the essay
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<string>} - The clarity and structure analysis
 */
export const analyzeEssayClarityStructure = async (essayContent, options = {}) => {
  const prompt = `
    Analyze the clarity and structure of the following essay. Evaluate paragraph
    organization, transitions, focus, and overall coherence:
    
    ${essayContent}
  `;
  
  return getGeminiResponse(prompt, options);
};

/**
 * Generate proof points from an essay to support analysis
 * @param {string} essayContent - The content of the essay
 * @param {string} claim - The claim to find evidence for
 * @param {object} options - Optional configuration overrides
 * @returns {Promise<Array>} - Array of proof points with page, paragraph, and highlight
 */
export const generateProofPoints = async (essayContent, claim, options = {}) => {
  const prompt = `
    You are an expert essay analyzer. Find evidence in the following essay that supports or refutes this claim: "${claim}"
    
    The essay text includes special markers:
    - [PAGE X] indicates the start of page X
    - [LY] indicates line number Y
    
    For each piece of evidence, identify:
    1. The page number where the evidence appears
    2. A short, distinctive phrase or sentence (5-15 words) that directly supports/refutes the claim
    3. The surrounding context containing the evidence
    
    IMPORTANT INSTRUCTIONS:
    - Find at least 3 pieces of evidence (if available)
    - For the highlight field, extract EXACT text from the essay - it must be a verbatim quote
    - Choose phrases that are unique and will be easy to search for
    - DO NOT include line number markers in your highlight text
    - DO NOT span multiple paragraphs in a single highlight
    - DO NOT modify, paraphrase or summarize the text in any way
    - The highlight MUST be a continuous string of text that appears exactly as written in the essay
    
    YOU MUST FORMAT YOUR RESPONSE AS A VALID JSON ARRAY with objects containing:
    { 
      "page": number, 
      "highlight": "exact phrase to highlight (must be verbatim)",
      "context": "surrounding text for context"
    }
    
    DO NOT include any explanatory text before or after the JSON array.
    ONLY return the JSON array and nothing else.
    
    Essay:
    ${essayContent}
  `;
  
  try {
    // Merge the provided options with our specific options for proof generation
    const mergedOptions = {
      ...options,
      generationConfig: {
        ...(options.generationConfig || {}),
        temperature: 0.1, // Very low temperature for factual, structured responses
        topP: 0.8,        // More focused sampling
        topK: 20          // More deterministic outputs
      }
    };
    
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
    
    // Try to parse the cleaned response as JSON
    try {
      const parsedData = JSON.parse(cleanedResponse);
      
      // Validate the structure of each proof point
      const validProofs = parsedData.filter(proof => {
        return proof && 
               typeof proof.page === 'number' &&
               typeof proof.highlight === 'string' &&
               typeof proof.context === 'string';
      });
      
      // Extract keywords from highlights for search fallback
      validProofs.forEach(proof => {
        // Extract keywords from the highlight
        const words = proof.highlight.split(/\s+/)
          .filter(word => word.length > 3)
          .filter(word => !['this', 'that', 'with', 'from', 'have', 'they', 'their', 'would', 'could', 'should'].includes(word.toLowerCase()));
        
        // Add keywords to the proof object
        proof.keywords = words.slice(0, Math.min(5, words.length));
        
        // Clean up the context by removing coordinate markers if they exist
        if (proof.context) {
          proof.context = proof.context.replace(/\[L\d+\]\s*/g, '')
                                      .replace(/\[X:\d+-\d+\]\s*/g, '')
                                      .replace(/\[Y:\d+\]\s*/g, '');
        }
      });
      
      if (validProofs.length > 0) {
        return validProofs;
      } else {
        console.warn('No valid proof points found in response');
        throw new Error('No valid proof points found');
      }
    } catch (parseError) {
      console.error('Failed to parse proof points as JSON:', parseError);
      console.log('Raw response:', response);
      console.log('Cleaned response:', cleanedResponse);
      
      // Attempt to extract paragraphs as a fallback
      const paragraphs = response.split('\n\n').filter(p => p.trim().length > 50);
      
      if (paragraphs.length > 0) {
        return paragraphs.slice(0, 3).map((paragraph, index) => {
          // Extract a reasonable highlight from the paragraph
          const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const highlight = sentences.length > 0 ? 
                          sentences[0].trim() : 
                          paragraph.substring(0, Math.min(100, paragraph.length)).trim();
          
          // Extract some potential keywords from the paragraph
          const words = paragraph.split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['this', 'that', 'with', 'from', 'have', 'they', 'their'].includes(word.toLowerCase()));
          
          return {
            page: index + 1,
            highlight: highlight,
            context: paragraph.trim(),
            keywords: words.slice(0, 5) // Take up to 5 keywords
          };
        });
      }
      
      // Last resort fallback
      return [
        {
          page: 1,
          highlight: claim.length > 100 ? claim.substring(0, 100) + '...' : claim,
          context: response.substring(0, 300) + '...',
          keywords: claim.split(/\s+/).filter(word => word.length > 3).slice(0, 5)
        }
      ];
    }
  } catch (error) {
    console.error('Error generating proof points:', error);
    return [
      {
        page: 1,
        highlight: "API error",
        context: "Could not generate evidence due to an API error. Please try again later.",
        keywords: ["error", "API", "generate"]
      }
    ];
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
  const prompt = `
    You are an expert essay grader. Grade the following essay based on a single criterion from a rubric.
    
    CRITERION: ${criterion.name}
    SCORE RANGE: ${criterion.scoreRange.min} to ${criterion.scoreRange.max}
    
    ESSAY:
    ${essayContent}
    
    Provide the following in your response:
    1. A detailed justification for your assessment (without revealing the exact score)
    2. At least 3 specific quotes from the essay that support your assessment
    3. Your numerical score (${criterion.scoreRange.min}-${criterion.scoreRange.max})
    
    FORMAT YOUR RESPONSE AS A VALID JSON object:
    {
      "justification": "Your detailed justification without revealing the exact score",
      "evidence": [
        { "quote": "exact quote from essay", "paragraph": "paragraph number or location" },
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
  const criteriaText = criteriaWithScores.map(c => 
    `${c.name}: Score ${c.teacherScore || c.aiScore} out of ${c.scoreRange.max}`
  ).join('\n');
  
  const prompt = `
    You are an expert essay grader. Based on the following criterion scores, provide an overall assessment
    and final grade for the essay.
    
    CRITERIA SCORES:
    ${criteriaText}
    
    ESSAY EXCERPT (first 1000 chars):
    ${essayContent.substring(0, 1000)}...
    
    Provide the following in your response:
    1. A summary of the essay's strengths
    2. A summary of areas for improvement
    3. An overall grade or score, for this use a 0 to 10 points scale. You may use decimals e.g 7.4
    4. Brief advice for the student
    
    FORMAT YOUR RESPONSE AS A VALID JSON object:
    {
      "strengths": "Summary of strengths",
      "improvements": "Areas for improvement",
      "overallGrade": "The final grade",
      "advice": "Brief advice for the student"
    }
    
    DO NOT include any explanatory text before or after the JSON object.
    ONLY return the JSON object and nothing else.
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
  generateEssaySummary,
  generateEssayGrade,
  generateEssayFeedback,
  identifyEssayStrengths,
  identifyEssayImprovements,
  analyzeEssayClarityStructure,
  generateProofPoints,
  extractRubricCriteria,
  gradeSingleCriterion,
  generateOverallAssessment,
  reviseCriterionScoreWithJustification
};

export default geminiService;
