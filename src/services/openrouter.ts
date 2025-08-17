import axios, { AxiosInstance, AxiosError } from 'axios';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export class OpenRouterClient {
  generateCompletion(generateCompletion: any) {
      throw new Error('Method not implemented.');
  }
  private client: AxiosInstance;
  private config: Required<OpenRouterConfig>;

  constructor(config: OpenRouterConfig) {
    this.config = {
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'zhipuai/glm-4.5-air',
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-tech-stack-converter.com',
        'X-Title': 'AI Tech Stack Converter',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  async chatCompletion(request: Omit<ChatCompletionRequest, 'model'>): Promise<ChatCompletionResponse> {
    const fullRequest: ChatCompletionRequest = {
      model: this.config.model,
      ...request,
    };

    return this.executeWithRetry(async () => {
      const response = await this.client.post<ChatCompletionResponse>('/chat/completions', fullRequest);
      return response.data;
    });
  }

  async generateCode(prompt: string, context?: Record<string, any>): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert software engineer specializing in code conversion between different technology stacks. Generate clean, functional, and well-structured code that maintains the original functionality while adapting to the target technology stack.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    if (context) {
      messages.splice(1, 0, {
        role: 'system',
        content: `Context: ${JSON.stringify(context, null, 2)}`,
      });
    }

    const response = await this.chatCompletion({
      messages,
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content generated from AI response');
    }

    return content;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as AxiosError)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    const status = error.response.status;
    
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429;
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response?.data) {
      const openRouterError = error.response.data as OpenRouterError;
      if (openRouterError.error) {
        throw new Error(`OpenRouter API Error: ${openRouterError.error.message}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('OpenRouter API request timeout');
    }

    if (!error.response) {
      throw new Error(`OpenRouter API network error: ${error.message}`);
    }

    throw new Error(`OpenRouter API error: ${error.response.status} ${error.response.statusText}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return !!response.choices[0]?.message?.content;
    } catch {
      return false;
    }
  }
}