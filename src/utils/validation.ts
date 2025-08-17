// Validation utilities

export function isValidGitHubUrl(url: string): boolean {
  const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
  return githubUrlPattern.test(url);
}

export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function validateTechStack(techStack: unknown): boolean {
  if (!techStack || typeof techStack !== 'object') {
    return false;
  }

  const stack = techStack as Record<string, unknown>;

  // Must have at least a language
  if (!stack.language || typeof stack.language !== 'string') {
    return false;
  }

  return true;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validateProjectName(name: string): boolean {
  const namePattern = /^[a-zA-Z0-9_.-]+$/;
  return namePattern.test(name) && name.length >= 1 && name.length <= 100;
}