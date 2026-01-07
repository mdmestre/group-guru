/**
 * AI Service
 * Integration with OpenAI/Anthropic for intelligent automation responses
 * Phase 3: Intelligent Automations
 */

import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import type { AIResponse, AIConfig } from '../models/types';

export class AIService {
  private openai: OpenAI | null = null;
  private config: AIConfig | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize AI service with API key from environment
   */
  private initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.logWarn('OpenAI API key not found. AI features will be disabled.');
      return;
    }

    this.config = {
      provider: 'openai',
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500')
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey
    });

    logger.logInfo('AI Service initialized', {
      provider: this.config.provider,
      model: this.config.model
    });
  }

  /**
   * Generate AI response based on context
   */
  async generateResponse(
    prompt: string,
    context?: {
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
      contactInfo?: Record<string, any>;
      systemPrompt?: string;
    }
  ): Promise<AIResponse> {
    if (!this.openai || !this.config) {
      throw new Error('AI service is not initialized. Please configure OPENAI_API_KEY.');
    }

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      // System prompt
      if (context?.systemPrompt) {
        messages.push({
          role: 'system',
          content: context.systemPrompt
        });
      } else {
        messages.push({
          role: 'system',
          content: 'You are a helpful customer service assistant. Be friendly, professional, and concise.'
        });
      }

      // Conversation history
      if (context?.conversationHistory) {
        context.conversationHistory.forEach((msg) => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Current prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Analyze sentiment (simple keyword-based for now)
      const sentiment = this.analyzeSentiment(responseText);

      return {
        text: responseText,
        confidence: 0.9, // Could be calculated based on model confidence
        sentiment,
        intent: this.extractIntent(prompt),
        suggestedActions: this.suggestActions(prompt, responseText)
      };
    } catch (error: any) {
      logger.logError('Error generating AI response', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['obrigado', 'obrigada', 'ótimo', 'excelente', 'perfeito', 'gostei', 'amo', 'adoro'];
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'odeio', 'não gosto', 'problema', 'erro'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract intent from text
   */
  private extractIntent(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('preço') || lowerText.includes('valor') || lowerText.includes('quanto')) {
      return 'price_inquiry';
    }
    if (lowerText.includes('comprar') || lowerText.includes('adquirir') || lowerText.includes('pedido')) {
      return 'purchase_intent';
    }
    if (lowerText.includes('suporte') || lowerText.includes('ajuda') || lowerText.includes('problema')) {
      return 'support_request';
    }
    if (lowerText.includes('cancelar') || lowerText.includes('devolver') || lowerText.includes('reembolso')) {
      return 'cancellation';
    }

    return 'general_inquiry';
  }

  /**
   * Suggest actions based on conversation
   */
  private suggestActions(prompt: string, response: string): string[] {
    const suggestions: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('preço') || lowerPrompt.includes('valor')) {
      suggestions.push('Send pricing information');
      suggestions.push('Schedule a demo');
    }

    if (lowerPrompt.includes('comprar') || lowerPrompt.includes('pedido')) {
      suggestions.push('Create order');
      suggestions.push('Add to cart');
    }

    if (lowerPrompt.includes('suporte') || lowerPrompt.includes('problema')) {
      suggestions.push('Create support ticket');
      suggestions.push('Escalate to human agent');
    }

    return suggestions;
  }

  /**
   * Summarize conversation
   */
  async summarizeConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.openai || !this.config) {
      throw new Error('AI service is not initialized.');
    }

    try {
      const conversationText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Summarize the following conversation in 2-3 sentences in Portuguese.'
          },
          {
            role: 'user',
            content: `Summarize this conversation:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || 'Unable to summarize conversation.';
    } catch (error: any) {
      logger.logError('Error summarizing conversation', error);
      throw new Error(`Failed to summarize conversation: ${error.message}`);
    }
  }

  /**
   * Classify message
   */
  async classifyMessage(
    message: string,
    categories: string[]
  ): Promise<{ category: string; confidence: number }> {
    if (!this.openai || !this.config) {
      throw new Error('AI service is not initialized.');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `Classify the following message into one of these categories: ${categories.join(', ')}. Respond with only the category name.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const category = completion.choices[0]?.message?.content?.trim() || categories[0];

      return {
        category,
        confidence: 0.8 // Could be improved with proper classification
      };
    } catch (error: any) {
      logger.logError('Error classifying message', error);
      throw new Error(`Failed to classify message: ${error.message}`);
    }
  }
}

// Singleton instance
export const aiService = new AIService();

