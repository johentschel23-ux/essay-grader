import { GoogleGenAI, createUserContent } from '@google/genai';
import geminiConfig from '../config/gemini.js';

// Initialize the Gemini API client (new SDK)
const ai = new GoogleGenAI({ apiKey: geminiConfig.apiKey });

/**
 * Extract criteria from a rubric
 * @param {string} rubricContent - The rubric content
 * @returns {Promise<Array>} - Array of criteria objects
 */
export const extractRubricCriteria = async (rubricContent, modelOverride = null) => {
  const prompt = `
    If the provided text is not a grading rubric, or you are not confident you can extract meaningful criteria, respond with the string: NO_VALID_RUBRIC (no JSON, no explanation).

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
  console.log(prompt);
  const mergedOptions = {
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };
  
  try {
    const response = await ai.models.generateContent({
      model: geminiConfig.model,
      contents: [createUserContent([prompt])],
      generationConfig: mergedOptions.generationConfig
    });    
    // Clean up the response to ensure it's valid JSON
    let cleanedResponse = response.text.trim();

    console.log(cleanedResponse);

    // Handle explicit NO_VALID_RUBRIC response
    if (cleanedResponse.toUpperCase() === 'NO_VALID_RUBRIC') {
      return 'NO_VALID_RUBRIC';
    }
    
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
    // If we get a 503 (model overloaded), try fallback model if not already using it
    const is503 = error && error.message && /503|overloaded|UNAVAILABLE/i.test(error.message);
    if (is503 && (!modelOverride || modelOverride === geminiConfig.model)) {
      try {
        // Fallback to gemini-1.5-flash
        return await extractRubricCriteria(rubricContent, 'gemini-1.5-flash');
      } catch (fallbackError) {
        // If fallback also fails, throw a special error
        throw new Error('MODEL_OVERLOADED');
      }
    }
    console.error('Error extracting rubric criteria:', error);
    throw error;
  }
};

// Only keep the fetch-based uploadContextDump implementation (context caching)
/**
 * Upload a context dump to Gemini's context caching endpoint.
 * @param {Array<{title: string, content: string}>} contextList - The context elements to cache
 * @returns {Promise<string>} - The context ID to use in subsequent prompts
 */
export const uploadContextDump = async (contextList, modelOverride = null) => {
  // Use the Gemini SDK to upload context and create a cache
  try {
    // Convert each context item to a Content object for the cache
    const contents = contextList.map(item =>
      createUserContent([{ text: `${item.title}\n${item.content}` }])
    );
    const modelToUse = modelOverride || geminiConfig.model;
    const cache = await ai.caches.create({
      model: modelToUse,
      config: {
        contents: contents,
        systemInstruction: 'You are an expert essay grading assistant. Use the provided context for all subsequent requests.'
      },
    });
    return cache.name; // This is the contextId to use in subsequent prompts
  } catch (error) {
    const is503 = error && error.message && /503|overloaded|UNAVAILABLE/i.test(error.message);
    if (is503 && (!modelOverride || modelOverride === geminiConfig.model)) {
      try {
        return await uploadContextDump(contextList, 'gemini-1.5-flash');
      } catch (fallbackError) {
        throw new Error('MODEL_OVERLOADED');
      }
    }
    console.error('Error uploading context to Gemini:', error);
    throw error;
  }
};


/**
 * Grade a single criterion from a rubric
 * @param {string} essayContent - The content of the essay
 * @param {object} criterion - The criterion object
 * @param {object} options - Optional configuration overrides
 * @param {Array} contextList - The context list
 * @returns {Promise<object>} - The assessment for this criterion
 */
export const gradeSingleCriterion = async (essayContent, criterion, options = {}, contextList, modelOverride = null) => {
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
  const relateInstruction = `
    For each evidence quote, indicate which sentences or bullet points from your justification it supports. Return the indexes (starting from 0) as a field "relatedAssessmentIndexes" in each evidence object. 
    If the justification is a paragraph, treat each sentence as a unit (split on periods, exclamation marks, or question marks). If it's a list, use each bullet as a unit.`;

  let lengthInstruction = '';
  if (assessmentLength === 'short') {
    lengthInstruction = 'Be concise and brief.';
  } else if (assessmentLength === 'medium') {
    lengthInstruction = 'Be balanced in detail and length.';
  } else {
    lengthInstruction = 'Be detailed and extended.';
  }

  // Inject context at the top of the prompt
  let contextBlock = '';
  if (contextList && contextList.length > 0) {
    contextBlock = 'CONTEXT DUMP:\n' + contextList.map(ctx => `- ${ctx.title}: ${ctx.content}`).join('\n') + '\n';
  }

  const prompt = `
    ${contextBlock}
    You are an expert essay grader of a masters level course. Grade the following essay based on a single criterion from a rubric. Your assessment must include specific references to the rubric criterion, quoting or paraphrasing the relevant rubric language as appropriate. Be critical and concise like a masters level professor would be.
    
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

  console.log('===== LLM PROMPT (gradeSingleCriterion) =====');
  console.log(prompt);
  console.log('==============================================');
  try {
    const response = await ai.models.generateContent({
      model: geminiConfig.model,
      contents: [createUserContent([prompt])],
      generationConfig: mergedOptions.generationConfig
    });    
    // Clean up the response to ensure it's valid JSON
    let cleanedResponse = response.text.trim();
    
    // Remove any markdown code block markers
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    console.log(cleanedResponse);
    
    // Remove any text before the first { and after the last }
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    
    return JSON.parse(cleanedResponse);
  } catch (error) {
    const is503 = error && error.message && /503|overloaded|UNAVAILABLE/i.test(error.message);
    if (is503 && (!modelOverride || modelOverride === geminiConfig.model)) {
      try {
        return await gradeSingleCriterion(essayContent, criterion, options, contextList, 'gemini-1.5-flash');
      } catch (fallbackError) {
        return {
          justification: "The Gemini API is overloaded. Please try again in a few minutes.",
          evidence: [],
          score: null,
          error: 'MODEL_OVERLOADED'
        };
      }
    }
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
export const generateOverallAssessment = async (essayContent, criteriaWithScores, options = {}, contextList = null, modelOverride = null) => {
  // Always use paragraph format and default length for overall assessment
  const strengthsInstruction = 'Present strengths as a coherent paragraph.';
  const improvementsInstruction = 'Present areas for improvement as a coherent paragraph.';
  // No length instruction needed for overall assessment
  const lengthInstruction = '';

  const criteriaText = criteriaWithScores.map(c => 
    `${c.name}: Score ${c.teacherScore || c.aiScore} out of ${c.scoreRange.max}`
  ).join('\n');
  
  // Inject context at the top of the prompt
  let contextBlock = '';
  if (contextList && contextList.length > 0) {
    contextBlock = 'CONTEXT DUMP:\n' + contextList.map(ctx => `- ${ctx.title}: ${ctx.content}`).join('\n') + '\n';
  }

  const prompt = `
    ${contextBlock}
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

  console.log('===== LLM PROMPT (generateOverallAssessment) =====');
  console.log(prompt);
  console.log('==================================================');
  try {
    const response = await ai.models.generateContent({
      model: geminiConfig.model,
      contents: [createUserContent([prompt])],
      generationConfig: mergedOptions.generationConfig
    });
    console.log('===== LLM RAW RESPONSE (generateOverallAssessment) =====');
    console.log(response.text.trim());
    console.log('===================================================');
    let cleanedResponse = response.text.trim();
    // Remove markdown code block markers if present
    cleanedResponse = cleanedResponse.replace(/^```json|^```js|^```javascript|^```/gi, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanedResponse);
  } catch (error) {
    const is503 = error && error.message && /503|overloaded|UNAVAILABLE/i.test(error.message);
    if (is503 && (!modelOverride || modelOverride === geminiConfig.model)) {
      try {
        return await generateOverallAssessment(essayContent, criteriaWithScores, options, contextList, 'gemini-1.5-flash');
      } catch (fallbackError) {
        return {
          strengths: "The Gemini API is overloaded. Please try again in a few minutes.",
          improvements: "Please review the individual criteria scores.",
          overallGrade: "N/A",
          advice: "Consider reviewing each criterion individually.",
          error: 'MODEL_OVERLOADED'
        };
      }
    }
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
  options = {},
  modelOverride = null
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

  console.log('===== LLM PROMPT (reviseCriterionScoreWithJustification) =====');
  console.log(prompt);
  console.log('==================================================');
  try {
    // Use the new SDK directly for revising criterion score
    const response = await ai.models.generateContent({
      model: geminiConfig.model,
      contents: [createUserContent([prompt])],
      generationConfig: mergedOptions.generationConfig
    });
    let cleanedResponse = response.text.trim();
    console.log('===== LLM RAW RESPONSE (reviseCriterionScoreWithJustification) =====');
    console.log(cleanedResponse);
    console.log('====================================================');
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleanedResponse);
    console.log('===== LLM PARSED RESPONSE (reviseCriterionScoreWithJustification) =====');
    console.log(parsed);
    console.log('=======================================================');
    return parsed;
  } catch (error) {
    const is503 = error && error.message && /503|overloaded|UNAVAILABLE/i.test(error.message);
    if (is503 && (!modelOverride || modelOverride === geminiConfig.model)) {
      try {
        return await reviseCriterionScoreWithJustification(
          essayContent,
          criterion,
          originalJustification,
          editedJustification,
          originalScore,
          options,
          'gemini-1.5-flash'
        );
      } catch (fallbackError) {
        return {
          revisedScore: originalScore,
          rationale: 'The Gemini API is overloaded. Please try again in a few minutes.',
          error: 'MODEL_OVERLOADED'
        };
      }
    }
    console.error('Error revising criterion score:', error);
    return {
      revisedScore: originalScore,
      rationale: 'There was an error revising the score. The original score is retained.'
    };
  }
};

const geminiService = {
  extractRubricCriteria,
  gradeSingleCriterion,
  generateOverallAssessment,
  reviseCriterionScoreWithJustification,
  uploadContextDump
};

export default geminiService;
// (Removed duplicate export of uploadContextDump to resolve redeclaration error)
