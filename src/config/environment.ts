/**
 * Environment Configuration Management
 *
 * Centralizes all environment variable handling with validation and defaults
 */

export interface EnvironmentConfig {
	// Application
	nodeEnv: "development" | "production" | "test";
	port: number;
	appUrl: string;

	// Database
	databaseUrl: string;

	// Redis
	redisUrl: string;

	// GitHub OAuth
	githubClientId: string;
	githubClientSecret: string;

	// OpenRouter AI
	openrouterApiKey: string;
	openrouterBaseUrl: string;

	// JWT
	jwtSecret: string;
}

class EnvironmentValidator {
	private static requiredVars = [
		"DATABASE_URL",
		"REDIS_URL",
		"GITHUB_CLIENT_ID",
		"GITHUB_CLIENT_SECRET",
		"OPENROUTER_API_KEY",
		"JWT_SECRET",
	];

	static validate(): void {
		const missing = this.requiredVars.filter(
			(varName) => !process.env[varName]
		);

		if (missing.length > 0) {
			throw new Error(
				`Missing required environment variables: ${missing.join(", ")}\n` +
					"Please check your .env file or environment configuration."
			);
		}
	}

	static getConfig(): EnvironmentConfig {
		this.validate();

		return {
			nodeEnv: (process.env.NODE_ENV as any) || "development",
			port: parseInt(process.env.PORT || "3000", 10),
			appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

			databaseUrl: process.env.DATABASE_URL!,
			redisUrl: process.env.REDIS_URL!,

			githubClientId: process.env.GITHUB_CLIENT_ID!,
			githubClientSecret: process.env.GITHUB_CLIENT_SECRET!,

			openrouterApiKey: process.env.OPENROUTER_API_KEY!,
			openrouterBaseUrl:
				process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",

			jwtSecret: process.env.JWT_SECRET!,
		};
	}
}

// Export singleton config
export const config = EnvironmentValidator.getConfig();

// Export validator for testing
export { EnvironmentValidator };
