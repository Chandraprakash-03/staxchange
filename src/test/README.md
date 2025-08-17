# AI Tech Stack Converter - Comprehensive Testing Suite

This directory contains a comprehensive testing suite for the AI Tech Stack Converter platform, covering all aspects of the application from unit tests to end-to-end workflows.

## 📋 Test Categories

### 1. Unit Tests (`src/test/{services,utils,models,repositories,agents}`)

- **Purpose**: Test individual functions, classes, and modules in isolation
- **Coverage**: Services, utilities, models, repositories, and AI agents
- **Execution Time**: < 5 seconds per test
- **Concurrency**: Parallel execution enabled

**Key Areas Covered**:

- AI service integration and code conversion
- GitHub import and repository analysis
- Authentication and user management
- Project management and tech stack detection
- Conversion planning and validation
- Error handling and recovery mechanisms

### 2. Integration Tests (`src/test/integration`)

- **Purpose**: Test interactions between multiple components
- **Coverage**: API endpoints, database operations, service integrations
- **Execution Time**: < 30 seconds per test
- **Concurrency**: Sequential execution (database dependencies)

**Key Areas Covered**:

- Database CRUD operations with Prisma
- API endpoint functionality and error handling
- Service-to-service communication
- Transaction handling and data integrity
- Cache operations and performance

### 3. Component Tests (`src/test/components`)

- **Purpose**: Test React components and UI interactions
- **Coverage**: All React components and their behaviors
- **Execution Time**: < 10 seconds per test
- **Concurrency**: Parallel execution enabled

**Key Areas Covered**:

- Import workflow components
- Tech stack selection interface
- Conversion progress monitoring
- Live preview functionality
- Export and download features

### 4. API Tests (`src/test/api`)

- **Purpose**: Test REST API endpoints and middleware
- **Coverage**: All API routes, authentication, validation
- **Execution Time**: < 15 seconds per test
- **Concurrency**: Parallel execution enabled

**Key Areas Covered**:

- Authentication endpoints (GitHub OAuth)
- Project management APIs
- Conversion job management
- File upload and download
- Rate limiting and security

### 5. End-to-End Tests (`src/test/e2e`)

- **Purpose**: Test complete user workflows using Playwright
- **Coverage**: Full application workflows from user perspective
- **Execution Time**: < 60 seconds per test
- **Concurrency**: Sequential execution (browser dependencies)

**Key Areas Covered**:

- Complete project import and conversion workflow
- Multi-step tech stack selection and configuration
- Real-time progress monitoring and updates
- Live preview and code editing
- Project export and download

### 6. Performance Tests (`src/test/performance`)

- **Purpose**: Validate performance characteristics and benchmarks
- **Coverage**: Conversion operations, memory usage, concurrent operations
- **Execution Time**: < 120 seconds per test
- **Concurrency**: Sequential execution (resource dependencies)

**Key Areas Covered**:

- Small, medium, and large project conversion performance
- Memory usage and cleanup
- Concurrent conversion handling
- AI service response times
- Database query performance

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:components
npm run test:e2e
npm run test:performance

# Run with coverage
npm run test:coverage
```

### Advanced Test Runner

```bash
# Use the comprehensive test runner
npm run test:comprehensive

# Run specific category with options
npm run test:comprehensive -- --category unit --coverage --verbose

# Run performance tests
npm run test:comprehensive -- --category performance

# Watch mode for development
npm run test:comprehensive -- --category unit --watch
```

### Test Runner Options

- `--category <type>`: Run specific test category
- `--coverage`: Generate coverage report
- `--watch`: Run tests in watch mode
- `--verbose`: Enable detailed output
- `--parallel`: Force parallel execution
- `--bail`: Stop on first failure
- `--reporter <type>`: Use specific reporter
- `--timeout <ms>`: Override default timeout

## 📊 Coverage Requirements

### Global Coverage Targets

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Critical Component Targets

- **Services**: 90% (core business logic)
- **Utilities**: 85% (shared functionality)
- **API Routes**: 85% (external interfaces)

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/index.html` (interactive report)
- **JSON**: `coverage/coverage.json` (machine readable)
- **Text**: Console output during test execution

## 🏗️ Test Structure and Organization

### Directory Structure

```
src/test/
├── agents/              # AI agent tests
├── api/                 # API endpoint tests
├── components/          # React component tests
├── e2e/                 # End-to-end workflow tests
├── integration/         # Integration tests
├── lib/                 # Library and utility tests
├── middleware/          # Middleware tests
├── models/              # Data model tests
├── performance/         # Performance and benchmark tests
├── repositories/        # Repository pattern tests
├── services/            # Service layer tests
├── unit/                # Additional unit tests
├── utils/               # Utility function tests
├── setup.ts             # Test environment setup
├── test-config.ts       # Test configuration
├── test-runner.ts       # Custom test runner
└── README.md            # This file
```

### Test Naming Conventions

- **Unit Tests**: `*.test.ts` or `*.test.tsx`
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.spec.ts`
- **Performance Tests**: `*.performance.test.ts`

### Mock Strategy

Tests use a comprehensive mocking strategy:

- **External Services**: Always mocked (GitHub API, OpenRouter API)
- **Database**: Mocked with Prisma mock client
- **File System**: Mocked for safety and speed
- **Time-dependent Operations**: Mocked for deterministic results

## 🔧 Test Configuration

### Environment Variables

Tests use environment-specific configurations:

```env
# Test Database
DATABASE_URL=postgresql://test:test@localhost:5432/test_db

# Test Redis
REDIS_URL=redis://localhost:6379/1

# Mock API Keys
GITHUB_CLIENT_ID=test_client_id
GITHUB_CLIENT_SECRET=test_client_secret
OPENROUTER_API_KEY=test_openrouter_key
JWT_SECRET=test_jwt_secret
```

### Vitest Configuration

Key configuration options:

- **Environment**: jsdom for component tests, node for others
- **Globals**: Enabled for test utilities
- **Setup Files**: Automatic mock setup and test utilities
- **Timeout**: Category-specific timeouts
- **Coverage**: V8 provider with comprehensive reporting

### Playwright Configuration

E2E test configuration:

- **Browsers**: Chromium, Firefox, WebKit
- **Parallel Execution**: Disabled for stability
- **Retries**: 2 retries on CI, 0 locally
- **Base URL**: http://localhost:3000
- **Trace Collection**: On retry for debugging

## 📈 Performance Benchmarks

### Conversion Performance Targets

- **Small Projects** (< 10 files): < 30 seconds
- **Medium Projects** (10-50 files): < 2 minutes
- **Large Projects** (50+ files): Streaming with progress updates

### Memory Usage Limits

- **Maximum Heap Usage**: 512MB
- **Per Test Suite**: 256MB
- **Memory Leak Detection**: Automatic cleanup validation

### Response Time Targets

- **Unit Tests**: < 100ms
- **API Endpoints**: < 2 seconds
- **Database Queries**: < 1 second
- **AI Service Calls**: < 10 seconds
- **File Conversions**: < 30 seconds

## 🐛 Debugging Tests

### Common Issues and Solutions

#### 1. Flaky E2E Tests

```bash
# Run with retries and debugging
npm run test:e2e:debug

# Check for timing issues
npm run test:e2e -- --timeout 60000
```

#### 2. Memory Leaks in Performance Tests

```bash
# Run with memory profiling
node --inspect npm run test:performance

# Check for unclosed resources
npm run test:performance -- --verbose
```

#### 3. Database Connection Issues

```bash
# Ensure test database is running
npm run db:init

# Reset test data
npm run db:migrate
```

### Test Debugging Tools

- **Vitest UI**: Interactive test runner (`npm run test:ui`)
- **Playwright Inspector**: E2E test debugging (`npm run test:e2e:debug`)
- **Coverage Reports**: Identify untested code paths
- **Performance Profiler**: Memory and timing analysis

## 🔄 Continuous Integration

### CI Pipeline Integration

Tests are designed for CI/CD environments:

- **Parallel Execution**: Where safe and beneficial
- **Retry Logic**: For flaky network-dependent tests
- **Artifact Collection**: Coverage reports and test results
- **Performance Regression Detection**: Benchmark comparisons

### GitHub Actions Configuration

```yaml
- name: Run Comprehensive Tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:components
    npm run test:coverage

- name: Run E2E Tests
  run: npm run test:e2e

- name: Performance Tests
  run: npm run test:performance
```

## 📚 Best Practices

### Writing Effective Tests

1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test intent should be obvious
3. **Single Responsibility**: One concept per test
4. **Deterministic**: Tests should be repeatable
5. **Fast Execution**: Optimize for quick feedback

### Mock Guidelines

1. **Mock External Dependencies**: Always mock external APIs
2. **Preserve Interfaces**: Mocks should match real implementations
3. **Test Behavior**: Focus on interactions, not implementation
4. **Reset State**: Clean up between tests
5. **Realistic Data**: Use representative test data

### Performance Testing

1. **Baseline Measurements**: Establish performance baselines
2. **Regression Detection**: Monitor for performance degradation
3. **Resource Cleanup**: Prevent memory leaks
4. **Realistic Scenarios**: Test with representative data sizes
5. **Concurrent Load**: Test under realistic concurrent usage

## 🎯 Future Enhancements

### Planned Improvements

- **Visual Regression Testing**: Screenshot comparison for UI components
- **Load Testing**: High-concurrency conversion scenarios
- **Security Testing**: Automated vulnerability scanning
- **Accessibility Testing**: WCAG compliance validation
- **Cross-browser Testing**: Extended browser compatibility

### Test Automation

- **Automatic Test Generation**: AI-powered test case generation
- **Smart Test Selection**: Run only affected tests
- **Performance Monitoring**: Continuous performance tracking
- **Test Quality Metrics**: Test effectiveness measurement

---

For questions or contributions to the testing suite, please refer to the main project documentation or open an issue in the repository.
