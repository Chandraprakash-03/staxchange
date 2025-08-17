# AI Tech Stack Converter - User Guide

Welcome to the AI Tech Stack Converter! This guide will help you get started with converting your projects between different technology stacks using AI.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Importing Projects](#importing-projects)
3. [Understanding Tech Stack Analysis](#understanding-tech-stack-analysis)
4. [Converting Your Project](#converting-your-project)
5. [Using the Live Preview](#using-the-live-preview)
6. [Downloading Results](#downloading-results)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- A GitHub account
- A repository you want to convert
- Basic understanding of the target technology stack

### Account Setup

1. **Sign Up**: Visit the AI Tech Stack Converter website
2. **Connect GitHub**: Click "Sign in with GitHub" to connect your account
3. **Grant Permissions**: Allow access to your repositories (public repositories only by default)

### Dashboard Overview

After signing in, you'll see your dashboard with:

- **Recent Projects**: Your imported and converted projects
- **Quick Actions**: Import new project, view conversions
- **Usage Stats**: Your current usage and limits
- **Help Center**: Access to guides and support

## Importing Projects

### Step 1: Start Import

1. Click **"Import Project"** from the dashboard
2. Enter your GitHub repository URL (e.g., `https://github.com/username/my-project`)
3. Select the branch you want to import (default: main)
4. Choose import options:
   - **Include Tests**: Import test files for conversion
   - **Include Documentation**: Import README and docs

### Step 2: Repository Analysis

The system will automatically:

- Clone your repository
- Analyze the file structure
- Detect the current tech stack
- Identify dependencies and configurations
- Calculate project complexity

### Step 3: Review Detection Results

Review the detected tech stack:

- **Primary Language**: Main programming language
- **Framework**: Web framework or library used
- **Runtime**: Execution environment
- **Build Tools**: Compilation and bundling tools
- **Package Manager**: Dependency management system
- **Database**: Data storage solution (if detected)

### Supported Repository Types

| Language   | Frameworks                    | Package Managers   |
| ---------- | ----------------------------- | ------------------ |
| JavaScript | React, Vue, Angular, Express  | npm, yarn, pnpm    |
| TypeScript | Next.js, Nest.js, Angular     | npm, yarn, pnpm    |
| Python     | Django, Flask, FastAPI        | pip, poetry, conda |
| Java       | Spring Boot, Spring MVC       | Maven, Gradle      |
| C#         | .NET Core, ASP.NET            | NuGet, dotnet      |
| Go         | Gin, Echo, Fiber              | go mod             |
| Rust       | Actix, Rocket, Warp           | Cargo              |
| PHP        | Laravel, Symfony, CodeIgniter | Composer           |
| Ruby       | Rails, Sinatra                | Bundler, gem       |

## Understanding Tech Stack Analysis

### Detection Process

The AI analyzes your project by examining:

1. **Package Files**: `package.json`, `requirements.txt`, `pom.xml`, etc.
2. **Configuration Files**: Framework-specific config files
3. **File Extensions**: Source code file types
4. **Import Statements**: Dependencies and libraries used
5. **Directory Structure**: Common patterns and conventions

### Accuracy Indicators

- **High Confidence** (90-100%): Clear indicators found
- **Medium Confidence** (70-89%): Some ambiguity in detection
- **Low Confidence** (50-69%): Limited or conflicting indicators
- **Unknown** (<50%): Unable to determine with confidence

### Manual Corrections

If the detection is incorrect:

1. Click **"Edit Detection"**
2. Select the correct technology from dropdowns
3. Add missing dependencies manually
4. Save your corrections

## Converting Your Project

### Step 1: Choose Target Stack

1. Select your target technology stack:
   - **Language**: Choose the target programming language
   - **Framework**: Select the web framework
   - **Runtime**: Pick the execution environment
   - **Database**: Choose data storage solution
   - **Deployment**: Select hosting platform

### Step 2: Conversion Planning

The AI will create a conversion plan showing:

- **Compatibility Analysis**: How well technologies align
- **Conversion Complexity**: Estimated difficulty (Simple/Medium/Complex)
- **Estimated Time**: Expected conversion duration
- **Potential Issues**: Known challenges and limitations
- **Manual Steps**: Tasks that may require human intervention

### Step 3: Review and Confirm

Before starting conversion:

- Review the conversion plan carefully
- Check compatibility warnings
- Understand manual steps required
- Confirm you want to proceed

### Step 4: Monitor Progress

During conversion, you can:

- **View Real-time Logs**: See what the AI is doing
- **Track Progress**: Monitor completion percentage
- **Pause/Resume**: Control the conversion process
- **Get Notifications**: Receive updates on completion

### Conversion Stages

1. **Analysis** (10%): Deep code analysis and dependency mapping
2. **Planning** (20%): Create detailed conversion strategy
3. **Code Generation** (60%): AI converts source files
4. **Configuration** (80%): Update config files and dependencies
5. **Validation** (90%): Test generated code for syntax errors
6. **Finalization** (100%): Package results and create documentation

## Using the Live Preview

### Preview Environment

The live preview provides:

- **Real-time Code Editor**: Monaco editor with syntax highlighting
- **File Explorer**: Navigate converted project structure
- **Terminal Access**: Run commands in the preview environment
- **Hot Reload**: See changes instantly
- **Error Display**: View compilation and runtime errors

### Making Changes

1. **Edit Files**: Click any file to open in the editor
2. **Add Files**: Right-click to create new files/folders
3. **Delete Files**: Select and delete unwanted files
4. **Run Commands**: Use the terminal for build/test commands

### Preview Limitations

- **Execution Time**: 30-minute session limit
- **Resource Limits**: 1GB RAM, 2 CPU cores
- **Network Access**: Limited external API calls
- **File Size**: 10MB maximum per file
- **Persistence**: Changes saved for 24 hours

### Supported Environments

| Technology | Environment  | Available Commands        |
| ---------- | ------------ | ------------------------- |
| Node.js    | WebContainer | npm, yarn, node, npx      |
| Python     | Pyodide      | pip, python, pytest       |
| Java       | OpenJDK      | javac, java, maven        |
| Go         | TinyGo       | go build, go run, go test |
| Rust       | wasm-pack    | cargo build, cargo run    |

## Downloading Results

### Export Options

1. **ZIP Archive**: Complete project as compressed file
2. **GitHub Repository**: Push to new GitHub repository
3. **Docker Image**: Containerized application
4. **Deployment Package**: Platform-specific deployment bundle

### What's Included

Your download contains:

- **Converted Source Code**: All transformed files
- **Configuration Files**: Updated for target stack
- **Dependencies**: Package/requirements files
- **Documentation**: Conversion notes and setup guide
- **Migration Guide**: Step-by-step migration instructions
- **Test Files**: Converted test suites (if applicable)

### Setup Instructions

Each download includes:

1. **README.md**: Project overview and quick start
2. **SETUP.md**: Detailed setup instructions
3. **MIGRATION.md**: Migration guide from original stack
4. **TROUBLESHOOTING.md**: Common issues and solutions

## Troubleshooting

### Common Issues

#### Import Problems

**Issue**: "Repository not found"

- **Solution**: Check URL spelling and repository visibility
- **Check**: Ensure repository is public or you have access

**Issue**: "Repository too large"

- **Solution**: Repository exceeds 500MB limit
- **Workaround**: Remove large files or use .gitignore

**Issue**: "Import timeout"

- **Solution**: Large repositories may take time
- **Action**: Wait and check status, or try again later

#### Conversion Problems

**Issue**: "Conversion failed"

- **Causes**: Unsupported code patterns, complex dependencies
- **Solution**: Check logs for specific errors, try simpler target stack

**Issue**: "Partial conversion"

- **Causes**: Some files couldn't be converted
- **Action**: Review unconverted files, may need manual conversion

**Issue**: "Preview not working"

- **Causes**: Build errors, missing dependencies
- **Solution**: Check terminal output, fix build issues

#### Performance Issues

**Issue**: "Slow conversion"

- **Causes**: Large project, complex code, high server load
- **Solution**: Be patient, conversions can take 10-30 minutes

**Issue**: "Preview loading slowly"

- **Causes**: Large project, many dependencies
- **Solution**: Wait for initial build, subsequent loads are faster

### Getting Help

1. **Documentation**: Check this guide and API docs
2. **FAQ**: Visit frequently asked questions
3. **Community**: Join our Discord community
4. **Support**: Contact support for technical issues
5. **GitHub Issues**: Report bugs on our GitHub repository

### Rate Limits

If you hit rate limits:

- **Wait**: Limits reset automatically
- **Upgrade**: Consider premium plan for higher limits
- **Optimize**: Reduce project size or complexity

## Best Practices

### Project Preparation

1. **Clean Repository**: Remove unnecessary files before import
2. **Update Dependencies**: Use latest stable versions
3. **Good Documentation**: Well-documented code converts better
4. **Standard Structure**: Follow framework conventions
5. **Test Coverage**: Include tests for better conversion quality

### Choosing Target Stack

1. **Similar Paradigms**: Choose similar architectural patterns
2. **Ecosystem Maturity**: Pick well-established technologies
3. **Team Expertise**: Consider your team's knowledge
4. **Project Requirements**: Match performance and feature needs
5. **Migration Path**: Consider gradual vs. complete migration

### Conversion Strategy

1. **Start Small**: Begin with smaller, simpler projects
2. **Incremental Approach**: Convert modules/components separately
3. **Test Early**: Validate converted code frequently
4. **Manual Review**: Always review AI-generated code
5. **Backup Original**: Keep original code safe

### Code Quality

1. **Follow Conventions**: Use target stack best practices
2. **Refactor Generated Code**: Improve AI output where needed
3. **Add Comments**: Document conversion decisions
4. **Update Tests**: Ensure tests work with new stack
5. **Performance Review**: Check for performance regressions

### Deployment Preparation

1. **Environment Setup**: Prepare target deployment environment
2. **Dependency Management**: Verify all dependencies are available
3. **Configuration**: Update environment-specific settings
4. **Security Review**: Check for security implications
5. **Monitoring**: Set up monitoring for the new stack

## Advanced Features

### Custom Conversion Rules

Premium users can:

- Define custom conversion patterns
- Specify naming conventions
- Set architectural preferences
- Create reusable conversion templates

### Batch Processing

Convert multiple projects:

- Queue multiple conversions
- Apply same target stack to multiple projects
- Monitor batch progress
- Download all results together

### Integration APIs

Integrate with your workflow:

- REST API for automation
- Webhooks for notifications
- CLI tools for command-line usage
- GitHub Actions for CI/CD integration

### Team Collaboration

Work with your team:

- Share projects with team members
- Collaborative editing in preview
- Comment and review system
- Version control integration

## Feedback and Improvement

We continuously improve the AI models based on:

- **User Feedback**: Rate conversion quality
- **Error Reports**: Help us fix issues
- **Feature Requests**: Suggest new capabilities
- **Success Stories**: Share your conversion experiences

Your feedback helps make the platform better for everyone!
