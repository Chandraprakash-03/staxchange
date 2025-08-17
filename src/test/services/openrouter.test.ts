import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OpenRouterClient, OpenRouterConfig, ChatCompletionResponse } from '../../services/openrouter';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  let mockAxiosInstance: any;

  const defaultConfig: OpenRouterConfig = {
    apiKey: 'test-api-key',
    maxRetries: 2,
    retryDelay: 100,
  };

  const mockResponse: ChatCompletionResponse = {
    id: 'test-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'zhipuai/glm-4.5-air',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'Test response content',
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    (axios as any).create = vi.fn().mockReturnValue(mockAxiosInstance);
    client = new OpenRouterClient(defaultConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://openrouter.ai/api/v1',
        timeout: 60000,
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-tech-stack-converter.com',
          'X-Title': 'AI Tech Stack Converter',
        },
      });
    });

    it('should use custom configuration when provided', () => {
      const customConfig: OpenRouterConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://custom.api.com',
        model: 'custom-model',
        timeout: 30000,
      };

      new OpenRouterClient(customConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.api.com',
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer custom-key',
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-tech-stack-converter.com',
          'X-Title': 'AI Tech Stack Converter',
        },
      });
    });
  });

  describe('chatCompletion', () => {
    it('should make successful API call', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 0.7,
      };

      const result = await client.chatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'zhipuai/glm-4.5-air',
        ...request,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: mockResponse });

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const result = await client.chatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow('Network error');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Bad request' } },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateCode', () => {
    it('should generate code with system prompt', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.generateCode('Convert this code');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'zhipuai/glm-4.5-air',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert software engineer'),
          },
          {
            role: 'user',
            content: 'Convert this code',
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
      expect(result).toBe('Test response content');
    });

    it('should include context when provided', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const context = { language: 'JavaScript', framework: 'React' };
      await client.generateCode('Convert this code', context);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'zhipuai/glm-4.5-air',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert software engineer'),
          },
          {
            role: 'system',
            content: `Context: ${JSON.stringify(context, null, 2)}`,
          },
          {
            role: 'user',
            content: 'Convert this code',
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });
    });

    it('should throw error when no content is generated', async () => {
      const emptyResponse = {
        ...mockResponse,
        choices: [{
          ...mockResponse.choices[0],
          message: { role: 'assistant' as const, content: '' },
        }],
      };
      mockAxiosInstance.post.mockResolvedValue({ data: emptyResponse });

      await expect(client.generateCode('Convert this code')).rejects.toThrow(
        'No content generated from AI response'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when response has no content', async () => {
      const emptyResponse = {
        ...mockResponse,
        choices: [{
          ...mockResponse.choices[0],
          message: { role: 'assistant' as const, content: '' },
        }],
      };
      mockAxiosInstance.post.mockResolvedValue({ data: emptyResponse });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle OpenRouter API errors', async () => {
      const error = {
        response: {
          status: 400, // 400 errors are not retryable
          statusText: 'Bad Request',
          data: {
            error: {
              message: 'Invalid request format',
              type: 'invalid_request_error',
            },
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const error = {
        message: 'Network Error',
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle HTTP errors without OpenRouter error format', async () => {
      const error = {
        response: {
          status: 400, // 400 errors are not retryable
          statusText: 'Bad Request',
          data: 'Server error',
        },
      };

      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 errors', async () => {
      const error = {
        response: { status: 500 },
      };
      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: mockResponse });

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const result = await client.chatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should retry on 429 (rate limit) errors', async () => {
      const error = {
        response: { status: 429 },
      };
      mockAxiosInstance.post
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: mockResponse });

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      const result = await client.chatCompletion(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should not retry on 400 errors', async () => {
      const error = {
        response: { status: 400 },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await expect(client.chatCompletion(request)).rejects.toThrow();
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });
  });
});