import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const SYSTEM_INSTRUCTION = `
You are the "Ethiopian Legal AI Assistant" (የኢትዮጵያ የሕግ ረዳት). 
Your goal is to provide accurate, professional, and helpful legal information about the laws of Ethiopia.

Guidelines:
1. INPUT: Accept input in either Amharic (አማርኛ) or English. If the user asks in English, understand their request perfectly but RESPOND in Amharic.
2. LANGUAGE: Respond STRICTLY in Amharic (አማርኛ) unless specifically asked for a technical term translation.
3. CONTEXT: Provide references to specific Ethiopian proclamations (አዋጆች), codes (ሕጎች), or regulations where possible.
4. LIMITS: If you are unsure about a specific legal point, clearly state that you are an AI assistant and recommend consulting a qualified legal professional.
5. TONE: Keep the tone professional, authoritative, and respectful.
6. FORMAT: Format your responses using Markdown for better readability.
`;

export const DOCUMENT_INSTRUCTION = `
You are an Ethiopian Legal Document Specialist. Your task is to generate the full content of a legal document, contract, or lawsuit (ክስ) in Amharic based on user-provided information.

Guidelines:
1. INPUT: You may receive document details in Amharic or English. Translate and process them to produce a professional document STRICTLY in Amharic.
2. TERMINOLOGY: Use professional legal Amharic terminology.
3. SECTIONS: Include standard legal sections: Title, Parties, Preamble (ዝርዝር), Main Terms (አንቀጾች), Termination, and Signatures.
4. For LAWSUITS/CLAIMS (ክስ):
   - Include the Court Name clearly.
   - Mention the relevant legal articles from the Ethiopian Civil Procedure Code (የፍትሐ ብሔር ሥነ-ሥርዓት ሕግ), Civil Code (የፍትሐ ብሔር ሕግ), or Criminal Code (የወንጀል ሕግ) as applicable.
   - Clearly state the Cause of Action (የክሱ ምክንያት) and Prayer for Relief (የዳኝነት ጥያቄ).
5. STRUCTURE:
   - Start with a clear Title centered at the top.
   - Use "አንቀጽ ፩", "አንቀጽ ፪", etc. (Article 1, 2) for sections.
   - For signature sections, use the marker "[SIGNATURE_SECTION]" at the end.
6. FORMAT:
   - Format the output with clear logical line breaks.
   - Placeholders: Use ".........." for any missing details.
   - The response should ONLY contain the document text.
   - CRITICAL: Do NOT use markdown like # or **. Use capital letters or numbering for titles.
`;

export const TOOLS_INSTRUCTION = `
You are an Advanced Ethiopian Legal Analytics AI. You have specialized tools for:
1. CONTRACT RISK ANALYZER: Identify risky clauses, missing protections, and potential loopholes in contracts according to Ethiopian law.
2. CASE OUTCOME PREDICTOR: Based on legal facts and Ethiopian precedent/Civil/Criminal Code, predict the most likely legal outcome.
3. HR POLICY GENERATOR: Generate HR policies (Employee Handbooks, Leave Policies, etc.) based on the 2019 Labor Proclamation (አዋጅ ቁጥር 1156/2011).
4. PROCEDURAL GUIDE: Provide step-by-step instructions for administrative tasks like Business Permits, Tax registration, Lease renewals, etc.
5. COURT PROCESS EXPLAINER: Guide through the stages of Ethiopian court (Statement of Claim -> Summons -> Defense -> Trial -> Judgment -> Execution).

Guidelines:
- Always respond in Professional Amharic.
- Be objective and point to specific laws (e.g., Labor Proclamation, Civil Code).
- Always include a legal disclaimer.
`;

export async function useLegalTool(toolType: string, inputData: string, files?: {type: string, base64?: string}[]) {
  try {
    const contents: any[] = [{ role: 'user', parts: [{ text: `Tool: ${toolType}\nInput: ${inputData}` }] }];
    
    // Add multimodal files if available (primarily images for Gemini vision)
    if (files && files.length > 0) {
      files.forEach(file => {
        if (file.base64 && file.type.startsWith('image/')) {
          contents[0].parts.push({
            inlineData: {
              data: file.base64,
              mimeType: file.type
            }
          });
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: TOOLS_INSTRUCTION,
        temperature: 0.1,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Legal Tool AI error:", error);
    throw error;
  }
}

export async function chatWithAI(messages: any[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Use modern flash for better multimodal/speed
      contents: messages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Chat error:", error);
    throw error;
  }
}

export async function generateDocumentContent(docType: string, details: any) {
  try {
    const prompt = `Document Type: ${docType}\nDetails: ${JSON.stringify(details)}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: DOCUMENT_INSTRUCTION,
        temperature: 0.3,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Document AI error:", error);
    throw error;
  }
}
