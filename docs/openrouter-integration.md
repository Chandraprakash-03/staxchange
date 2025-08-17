# OpenRouter AI Client Integration

This document describes the OpenRouter AI client integration for the AI Tech Stack Converter platform.

## Overview

The OpenRouter integration provides AI-powered code conversion capabilities using the GLM-4.5-Air model. The implementation includes:

- **OpenRouter API Client**: Direct integration with OpenRouter's API
- **AI Service**: High-level service for code conversion operations
- **Prompt Engineering**: Sophisticated prompt generation for optimal AI responses
- **Error Handling**: Comprehensive error handling and retry logic
- **Testing**: Complete test suite with mocked responses

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Service    │───▶│ OpenRouter Client│───▶│ OpenRouter API  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Prompt Engineer │    │ Error Handling   │    │ GLM-4.5-Air     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components

### 1. OpenRouter Client (`src/services/openrouter.ts`)

The core client for interacting with the OpenRouter API.

**Features:**
- GLM-4.5-Air model integration
- Automatic retry with exponential backoff
- Comprehensive error handling
- Request/response validation
- Health check capabilities

**Configuration:**
```typescript
const client = new OpenRouterClient({
  apiKey: 'your-openrouter-api-key',
  model: 'zhipuai/glm-4.5-air', // Default model
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
});
```

**Usage:**
```typescript
// Simple chat completion
const response = await client.chatCompletion({
  messages: [
    { role: 'user', content: 'Convert this JavaScript to TypeScript' }
  ],
  temperature: 0.1,
  max_tokens: 4000,
});

// Code generation with context
const code = await client.generateCode(
  'Convert this React component to Vue',
  { framework: 'React', target: 'Vue' }
);
```

### 2. AI Service (`src/services/ai.ts`)

High-level service that combines the OpenRouter client with prompt engineering.

**Features:**
- Code conversion between tech stacks
- Code analysis and structure detection
- Conversion validation
- Test case generation
- Workflow orchestration

**Usage:**
```typescript
const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultOptions: {
    includeComments: true,
    preserveFormatting: true,
    optimizeForPerformance: true,
    followBestPractices: true,
  },
});

// Convert code
const result = await aiService.convertCode({
  sourceCode: 'function hello() { return "Hello"; }',
  fileName: 'hello.js',
  sourceTechStack: { language: 'JavaScript', additional: {} },
  targetTechStack: { language: 'TypeScript', additional: {} },
});
```

### 3. Prompt Engineering (`src/utils/prompt-engineering.ts`)

Sophisticated prompt generation for optimal AI responses.

**Features:**
- Context-aware prompt generation
- Tech stack specific prompts
- Code analysis prompts
- Validation prompts
- Test generation prompts
- Prompt optimization utilities

**Usage:**
```typescript
// Generate conversion prompt
const prompt = PromptEngineer.generateConversionPrompt({
  sourceCode: 'const x = 1;',
  fileName: 'example.js',
  sourceTechStack: { language: 'JavaScript', additional: {} },
  targetTechStack: { language: 'TypeScript', additional: {} },
}, {
  includeComments: true,
  followBestPractices: true,
});

// Generate analysis prompt
const analysisPrompt = PromptEngineer.generateAnalysisPrompt(
  sourceCode,
  fileName,
  techStack
);
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Getting an OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for an account
3. Navigate to the API Keys section
4. Generate a new API key
5. Add the key to your environment variables

### Model Selection

The integration uses GLM-4.5-Air by default, which is:
- **Free to use** (fits requirement 8.2)
- **High quality** for code generation
- **Fast response times**
- **Good context length** for code conversion

You can change the model by updating the configuration:

```typescript
const client = new OpenRouterClient({
  apiKey: 'your-key',
  model: 'anthropic/claude-3-haiku', // Alternative model
});
```

## Error Handling

The integration includes comprehensive error handling:

### Retry Logic
- **Retryable errors**: 5xx server errors, 429 rate limits, network errors
- **Non-retryable errors**: 4xx client errors (except 429)
- **Exponential backoff**: Increasing delays between retries
- **Max retries**: Configurable (default: 3)

### Error Types
```typescript
// API errors
OpenRouter API Error: Invalid request format

// Network errors
OpenRouter API network error: Connection failed

// Timeout errors
OpenRouter API request timeout

// Rate limiting
OpenRouter API Error: Rate limit exceeded
```

### Error Recovery
```typescript
try {
  const result = await aiService.convertCode(request);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
    await delay(60000); // Wait 1 minute
    return retry();
  } else if (error.message.includes('network')) {
    // Handle network issues
    return fallbackToCache();
  }
  throw error;
}
```

## Testing

The integration includes comprehensive tests:

### Test Files
- `src/test/services/openrouter.test.ts` - OpenRouter client tests
- `src/test/services/ai.test.ts` - AI service tests  
- `src/test/utils/prompt-engineering.test.ts` - Prompt engineering tests

### Running Tests
```bash
# Run all AI-related tests
npm test -- --run src/test/services/openrouter.test.ts src/test/services/ai.test.ts src/test/utils/prompt-engineering.test.ts

# Run specific test file
npm test -- --run src/test/services/openrouter.test.ts
```

### Test Coverage
- **OpenRouter Client**: 19 tests covering all functionality
- **AI Service**: 19 tests covering conversion workflows
- **Prompt Engineering**: 35 tests covering prompt generation

## Usage Examples

### Basic Code Conversion
```typescript
import { AIService } from './services/ai';

const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const result = await aiService.convertCode({
  sourceCode: `
    function calculateTotal(items) {
      return items.reduce((sum, item) => sum + item.price, 0);
    }
  `,
  fileName: 'calculator.js',
  sourceTechStack: { language: 'JavaScript', additional: {} },
  targetTechStack: { language: 'TypeScript', additional: {} },
});

console.log(result.convertedCode);
// Output: TypeScript version with proper types
```

### Full Workflow Example
```typescript
// 1. Analyze source code
const analysis = await aiService.analyzeCode({
  sourceCode: reactComponent,
  fileName: 'Component.jsx',
  techStack: { language: 'JavaScript', framework: 'React', additional: {} },
});

// 2. Convert to target stack
const conversion = await aiService.convertCode({
  sourceCode: reactComponent,
  fileName: 'Component.jsx',
  sourceTechStack: { language: 'JavaScript', framework: 'React', additional: {} },
  targetTechStack: { language: 'TypeScript', framework: 'Vue', additional: {} },
});

// 3. Validate conversion
const validation = await aiService.validateConversion({
  originalCode: reactComponent,
  convertedCode: conversion.convertedCode,
  context: { /* ... */ },
});

// 4. Generate tests
const tests = await aiService.generateTests(
  reactComponent,
  conversion.convertedCode,
  context
);
```

## Performance Considerations

### Request Optimization
- **Code truncation**: Long files are automatically truncated
- **Context extraction**: Only important files are included in context
- **Prompt optimization**: Prompts are optimized for token efficiency

### Caching Strategy
- **Response caching**: Cache AI responses for identical requests
- **Context caching**: Cache analysis results for reuse
- **Prompt caching**: Cache generated prompts

### Rate Limiting
- **Built-in delays**: Automatic delays between requests
- **Queue management**: Request queuing for high-volume usage
- **Retry backoff**: Exponential backoff for rate-limited requests

## Troubleshooting

### Common Issues

**1. API Key Issues**
```
Error: OpenRouter API Error: Invalid API key
```
- Verify your API key is correct
- Check environment variable is set
- Ensure key has proper permissions

**2. Rate Limiting**
```
Error: OpenRouter API Error: Rate limit exceeded
```
- Implement request delays
- Use exponential backoff
- Consider upgrading API plan

**3. Network Issues**
```
Error: OpenRouter API network error: Connection failed
```
- Check internet connection
- Verify API endpoint accessibility
- Check firewall settings

**4. Model Issues**
```
Error: OpenRouter API Error: Model not found
```
- Verify model name is correct
- Check model availability
- Use default GLM-4.5-Air model

### Debug Mode

Enable debug logging:
```typescript
const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
  // Add debug configuration if needed
});
```

## Best Practices

### 1. API Key Security
- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Restrict key permissions

### 2. Error Handling
- Always wrap AI calls in try-catch
- Implement proper retry logic
- Provide fallback mechanisms
- Log errors for debugging

### 3. Performance
- Cache responses when possible
- Optimize prompt length
- Use appropriate models for tasks
- Implement request queuing

### 4. Quality Assurance
- Always validate AI responses
- Implement confidence scoring
- Use multiple validation methods
- Test with diverse code samples

## Future Enhancements

### Planned Features
- **Model switching**: Dynamic model selection based on task
- **Streaming responses**: Real-time response streaming
- **Batch processing**: Multiple file conversion in single request
- **Custom models**: Support for fine-tuned models
- **Advanced caching**: Intelligent response caching

### Integration Opportunities
- **IDE plugins**: Direct integration with development environments
- **CI/CD pipelines**: Automated conversion in build processes
- **Code review**: AI-assisted code review and suggestions
- **Documentation**: Automatic documentation generation

## Contributing

When contributing to the AI integration:

1. **Follow patterns**: Use existing patterns for new AI features
2. **Add tests**: Include comprehensive tests for new functionality
3. **Update docs**: Keep documentation current with changes
4. **Error handling**: Implement proper error handling and recovery
5. **Performance**: Consider performance implications of AI calls

## Support

For issues related to the OpenRouter integration:

1. Check the troubleshooting section
2. Review test files for usage examples
3. Check OpenRouter documentation
4. Create an issue with detailed error information