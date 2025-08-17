// Application constants

export const TECH_STACKS = {
  LANGUAGES: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C#',
    'Go',
    'Rust',
    'PHP',
    'Ruby',
  ],
  FRAMEWORKS: {
    JavaScript: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js'],
    TypeScript: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js'],
    Python: ['Django', 'Flask', 'FastAPI', 'Pyramid'],
    Java: ['Spring Boot', 'Spring MVC', 'Quarkus'],
    'C#': ['.NET Core', 'ASP.NET', 'Blazor'],
    Go: ['Gin', 'Echo', 'Fiber'],
    Rust: ['Actix', 'Warp', 'Rocket'],
    PHP: ['Laravel', 'Symfony', 'CodeIgniter'],
    Ruby: ['Rails', 'Sinatra'],
  },
  DATABASES: [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'SQLite',
    'Redis',
    'Cassandra',
    'DynamoDB',
  ],
  BUILD_TOOLS: [
    'Webpack',
    'Vite',
    'Rollup',
    'Parcel',
    'esbuild',
    'Turbopack',
  ],
};

export const PROJECT_STATUS = {
  IMPORTED: 'imported',
  ANALYZING: 'analyzing',
  READY: 'ready',
  CONVERTING: 'converting',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const CONVERSION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const TASK_TYPES = {
  ANALYSIS: 'analysis',
  CODE_GENERATION: 'code_generation',
  DEPENDENCY_UPDATE: 'dependency_update',
  CONFIG_UPDATE: 'config_update',
  VALIDATION: 'validation',
  INTEGRATION: 'integration',
} as const;

export const AGENT_TYPES = {
  ANALYSIS: 'analysis',
  PLANNING: 'planning',
  CODE_GENERATION: 'code_generation',
  VALIDATION: 'validation',
  INTEGRATION: 'integration',
} as const;