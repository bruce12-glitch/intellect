import { logger } from '../utils/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SummaryRequest {
  content: string;
  title: string;
  sourceType: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'google';
  customPrompt?: string;
}

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  tokensUsed: number;
}

interface AudioSummaryRequest {
  text: string;
  voiceProfile: {
    id: string;
    provider: string;
    voiceId: string;
  };
}

const SYSTEM_PROMPT = `You are an expert summarizer. Create a concise, well-structured summary of the provided content. 
Focus on the key insights, main arguments, and actionable takeaways.
Format your response as JSON with "summary" (markdown formatted) and "keyPoints" (array of strings).`;

const DEFAULT_PROMPTS: Record<string, string> = {
  youtube: `Summarize this YouTube video transcript. Include timestamps if mentioned.`,
  podcast: `Summarize this podcast episode. Highlight key discussions, guests, and takeaways.`,
  article: `Summarize this article. Capture the main thesis, supporting arguments, and conclusions.`,
  pdf: `Summarize this PDF document. Extract the most important information and structure it clearly.`,
  wikipedia: `Summarize this Wikipedia article. Focus on the most significant facts and context.`,
  generic: `Summarize this content. Extract key insights and actionable information.`,
};

export async function generateSummary(request: SummaryRequest): Promise<SummaryResult> {
  const { content, title, sourceType, model, provider, customPrompt } = request;
  
  const systemPrompt = customPrompt || SYSTEM_PROMPT;
  const sourcePrompt = DEFAULT_PROMPTS[sourceType] || DEFAULT_PROMPTS.generic;
  const userPrompt = `${sourcePrompt}\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 100000)}`;
  
  let result: SummaryResult;
  
  switch (provider) {
    case 'openai':
      result = await generateWithOpenAI(model, systemPrompt, userPrompt);
      break;
    case 'anthropic':
      result = await generateWithAnthropic(model, systemPrompt, userPrompt);
      break;
    case 'google':
      result = await generateWithGoogle(model, systemPrompt, userPrompt);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  
  logger.info({ model, provider, tokensUsed: result.tokensUsed }, 'Summary generated');
  return result;
}

async function generateWithOpenAI(model: string, systemPrompt: string, userPrompt: string): Promise<SummaryResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });
  
  const response = JSON.parse(completion.choices[0].message.content || '{}');
  
  return {
    summary: response.summary || '',
    keyPoints: response.keyPoints || [],
    tokensUsed: completion.usage?.total_tokens || 0,
  };
}

async function generateWithAnthropic(model: string, systemPrompt: string, userPrompt: string): Promise<SummaryResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const message = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }
  
  const response = JSON.parse(content.text);
  
  return {
    summary: response.summary || '',
    keyPoints: response.keyPoints || [],
    tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens || 0,
  };
}

async function generateWithGoogle(model: string, systemPrompt: string, userPrompt: string): Promise<SummaryResult> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const geminiModel = genAI.getGenerativeModel({ model });
  
  const prompt = `${systemPrompt}\n\n${userPrompt}\n\nRespond with valid JSON only.`;
  
  const result = await geminiModel.generateContent(prompt);
  const response = JSON.parse(result.response.text());
  
  return {
    summary: response.summary || '',
    keyPoints: response.keyPoints || [],
    tokensUsed: 0, // Google doesn't return token counts in the same way
  };
}

export async function generateAudioSummary(request: AudioSummaryRequest): Promise<string> {
  const { text, voiceProfile } = request;
  
  // This is a placeholder - actual implementation would use ElevenLabs, OpenAI TTS, etc.
  // For now, return a placeholder URL
  logger.info({ voiceProfileId: voiceProfile.id }, 'Audio summary requested');
  
  // In production, you would:
  // 1. Call ElevenLabs API with voiceProfile.voiceId
  // 2. Or use OpenAI TTS
  // 3. Upload to S3/storage
  // 4. Return the URL
  
  return `https://api.intellect.app/audio/${voiceProfile.id}/summary-${Date.now()}.mp3`;
}

export async function generateQuiz(content: string, title: string, count: number = 5) {
  const prompt = `Create ${count} quiz questions based on this content. 
Format as JSON array with objects containing: question, type (multiple_choice/true_false/short_answer), options (for multiple choice), correctAnswer, explanation.
Title: ${title}
Content: ${content.slice(0, 50000)}`;
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert quiz creator. Create engaging, educational questions.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });
  
  return JSON.parse(completion.choices[0].message.content || '{"questions":[]}');
}

export async function findConnections(contentItems: Array<{ id: string; title: string; summary?: string; tags: string[] }>) {
  // Simple tag-based connection finding
  // In production, use embeddings for semantic similarity
  const connections: Array<{ sourceId: string; targetId: string; type: string; strength: number }> = [];
  
  for (let i = 0; i < contentItems.length; i++) {
    for (let j = i + 1; j < contentItems.length; j++) {
      const item1 = contentItems[i];
      const item2 = contentItems[j];
      
      // Tag overlap
      const commonTags = item1.tags.filter(t => item2.tags.includes(t));
      if (commonTags.length > 0) {
        connections.push({
          sourceId: item1.id,
          targetId: item2.id,
          type: 'tag',
          strength: Math.min(commonTags.length / 5, 1),
        });
      }
      
      // Title similarity (simple)
      const words1 = new Set(item1.title.toLowerCase().split(/\s+/));
      const words2 = new Set(item2.title.toLowerCase().split(/\s+/));
      const intersection = [...words1].filter(w => words2.has(w));
      if (intersection.length > 2) {
        connections.push({
          sourceId: item1.id,
          targetId: item2.id,
          type: 'semantic',
          strength: Math.min(intersection.length / 10, 0.8),
        });
      }
    }
  }
  
  return connections;
}