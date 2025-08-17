# AI Tech Stack Converter

A web-based platform that enables developers to import their existing projects from GitHub, select a target technology stack, and automatically convert their codebase using AI-powered agentic workflows.

## Features

- Import projects from GitHub repositories
- Analyze current tech stack automatically
- Select target technology stack from comprehensive options
- AI-powered code conversion using agentic workflows
- Live preview of converted applications
- Download converted projects as complete packages

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **Cache/Queue**: Redis, Bull Queue
- **AI**: OpenRouter API with GLM-4.5-Air model
- **Preview**: WebContainers API
- **Code Editor**: Monaco Editor

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-tech-stack-converter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the database services**
   ```bash
   npm run docker:up
   ```

4. **Configure environment variables**
   - Copy `.env.local` and update the values:
     - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for GitHub OAuth
     - `OPENROUTER_API_KEY` for AI model access
     - `JWT_SECRET` for authentication

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser

## Development Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── lib/                 # Database and Redis connections
├── models/              # Data models and database operations
├── services/            # Business logic services
├── types/               # TypeScript type definitions
└── utils/               # Utility functions and constants
```

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and GitHub OAuth data
- `projects` - Imported GitHub projects and metadata
- `conversion_jobs` - Conversion tasks and progress tracking

## Contributing

This project follows the spec-driven development methodology. See the `.kiro/specs/` directory for detailed requirements, design, and implementation plans.

## License

MIT License