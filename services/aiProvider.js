import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Normalizes content inputs and routes the generation request to Groq (primary) or Gemini (fallback).
 * 
 * @param {object} params
 * @param {string} params.systemInstruction - System instructions/persona.
 * @param {string|Array} params.contents - User prompt or a history array of form [{ role, parts: [{ text }] }]
 * @param {number} params.temperature - Sampling temperature (0.0 to 1.0)
 * @param {string} params.responseMimeType - "text/plain" or "application/json"
 * @returns {Promise<{text: string}>}
 */
export async function generateContent({ systemInstruction = "", contents, temperature = 0.2, responseMimeType = "text/plain" }) {
  const hasGroq = !!process.env.GROQ_API_KEY;

  if (hasGroq) {
    try {
      console.log("[AIProvider] Generating text via Groq...");

      let messages = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }

      if (typeof contents === "string") {
        messages.push({ role: "user", content: contents });
      } else if (Array.isArray(contents)) {
        contents.forEach(item => {
          // Gemini role: "model", OpenAI role: "assistant"
          const role = item.role === "model" ? "assistant" : item.role;
          const text = item.parts?.[0]?.text || "";
          if (text) {
            messages.push({ role, content: text });
          }
        });
      }

      const body = {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature,
      };

      if (responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
      }

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        body,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          timeout: 25000,
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content || "";
      return { text: reply };

    } catch (error) {
      console.error("[AIProvider] Groq completion failed:", error.response?.data || error.message);
      
      // Fallback to Gemini if a key is available and not a placeholder/invalid
      if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("AQ.")) {
        console.log("[AIProvider] Falling back to Gemini...");
        return callGemini({ systemInstruction, contents, temperature, responseMimeType });
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
  } else {
    return callGemini({ systemInstruction, contents, temperature, responseMimeType });
  }
}

async function callGemini({ systemInstruction, contents, temperature, responseMimeType }) {
  console.log("[AIProvider] Generating text via Gemini...");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const config = {
    temperature,
  };
  if (responseMimeType === "application/json") {
    config.responseMimeType = "application/json";
  }
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config,
  });

  return { text: res.text };
}
