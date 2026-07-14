import { pipeline } from '@xenova/transformers';

let extractor = null;

/**
 * Returns a cached instance of the feature extraction pipeline.
 */
async function getExtractor() {
  if (!extractor) {
    console.log("[EmbeddingService] Loading Xenova/all-MiniLM-L6-v2 model...");
    // Load the pipeline for feature-extraction (embeddings)
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

/**
 * Generates a 384-dimensional vector embedding for the input text.
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error("Text must be a non-empty string");
    }
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const pipe = await getExtractor();
    const output = await pipe(cleanText, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  } catch (error) {
    console.error("[EmbeddingService] Error generating embedding:", error.message);
    throw error;
  }
}

/**
 * Computes the cosine similarity between two numeric vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} range [-1, 1]
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
