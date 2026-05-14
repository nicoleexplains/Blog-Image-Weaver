import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper function to execute an API call with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.code;
      const message = error.message?.toLowerCase() || "";
      
      // Retry on 429 (Quota) or 500/503 (Server errors)
      const shouldRetry = status === 429 || status === 500 || status === 503 || 
                          message.includes("quota") || message.includes("exhausted") || 
                          message.includes("rpc failed") || message.includes("xhr error");
      
      if (shouldRetry && i < maxRetries) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`API call failed (attempt ${i + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Gets a fresh instance of GoogleGenAI using the current API key.
 */
function getAI() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    // This will be caught by the App component and trigger the key selection dialog
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates a list of image prompts from a given blog article.
 */
export async function generatePromptsFromArticle(articleText: string, existingPrompts: string[] = []): Promise<string[]> {
  return withRetry(async () => {
    const ai = getAI();
    let promptText = `Here is a blog article:\n\n---\n${articleText}\n---\n\nPlease generate an array of 5 distinct and visually descriptive image prompts that capture the key themes and moments in this article.`;

    if (existingPrompts.length > 0) {
      promptText += `\n\nThe following prompts have already been generated. Please generate 5 NEW, DIFFERENT prompts that explore other aspects of the article or use different visual styles:\n${existingPrompts.map(p => `- ${p}`).join('\n')}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompts: {
              type: Type.ARRAY,
              description: "An array of 5 visually descriptive image prompts.",
              items: {
                type: Type.STRING,
                description: "A single, concise, and visually descriptive prompt."
              }
            }
          },
          required: ["prompts"],
        },
        systemInstruction: "You are an expert art director. Your task is to read a blog article and generate a series of concise, visually descriptive prompts for an AI image generator. The prompts should capture the key themes, concepts, or scenes from the article. The style should be photorealistic and cinematic unless the article suggests otherwise. CRITICAL SAFETY INSTRUCTION: The image generation model has strict safety filters. Do not generate prompts that depict illegal drugs, drug paraphernalia, excessive violence, or explicit content. If the article discusses these topics, generate METAPHORICAL, SYMBOLIC, or ABSTRACT prompts that capture the mood or theme without depicting the restricted elements directly.",
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(jsonText);
    
    if (parsed && Array.isArray(parsed.prompts)) {
      return parsed.prompts;
    } else {
      throw new Error("Failed to parse prompts from the AI response.");
    }
  });
}

/**
 * Generates an image from a given prompt using the standard Gemini 2.5 Flash Image model.
 */
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { text: `${prompt}, photorealistic, cinematic, high quality, 16:9 aspect ratio` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
         return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in the response.");
  }).catch((error: any) => {
    console.error("Image generation failed:", error);
    
    let errorMessage = "Failed to generate image.";
    const errStr = error.message?.toLowerCase() || "";

    if (errStr.includes("safety")) {
      errorMessage = "Image generation blocked by safety filters. Try making the prompt more abstract.";
    } else if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("exhausted")) {
      errorMessage = "Usage quota exceeded. Please try again in a few minutes or check your billing details.";
    } else if (errStr.includes("key") || errStr.includes("API_KEY_MISSING")) {
      errorMessage = "API key configuration issue. Please select a valid API key.";
    } else {
      errorMessage = error.message || "An unexpected error occurred.";
    }
    
    throw new Error(errorMessage);
  });
}

/**
 * Generates a relevant and descriptive caption for an image based on its generation prompt.
 */
export async function generateCaptionFromPrompt(prompt: string): Promise<string> {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a relevant and descriptive caption for an image that was created with this prompt: "${prompt}". The caption should be SEO-friendly, engaging for readers, and also suitable for use as alt text (describing the visual content clearly).`,
      config: {
        systemInstruction: "You are an expert content creator and SEO specialist. Your task is to write high-quality image captions. The caption should be descriptive, engaging, and concise (under 150 characters). It should accurately describe the visual scene while being optimized for search engines. Avoid generic phrases like 'image of' or 'picture of'.",
      }
    });

    return response.text?.trim() || `Generated image for: ${prompt}`;
  }).catch((error) => {
    console.error("Caption generation failed:", error);
    return `Generated image for: ${prompt}`;
  });
}
