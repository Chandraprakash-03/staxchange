/**
 * User-friendly error messages and recovery suggestions
 */

import { AppError, ErrorCategory, RecoveryAction } from "./errors";

export interface UserErrorMessage {
	title: string;
	description: string;
	suggestions: string[];
	actions: UserAction[];
	severity: "info" | "warning" | "error" | "critical";
	icon?: string;
}

export interface UserAction {
	label: string;
	type: "button" | "link" | "retry";
	action: string;
	primary?: boolean;
	disabled?: boolean;
	estimatedTime?: string;
}

export class ErrorMessageGenerator {
	/**
	 * Generate user-friendly error message from AppError
	 */
	static generateUserMessage(error: AppError): UserErrorMessage {
		const baseMessage = this.getBaseMessage(error.category);

		return {
			title: baseMessage.title,
			description: error.userMessage || baseMessage.description,
			suggestions: this.generateSuggestions(error),
			actions: this.generateActions(error.recoveryActions),
			severity: this.mapSeverityToUserSeverity(error.severity),
			icon: this.getIconForCategory(error.category),
		};
	}

	/**
	 * Generate contextual suggestions based on error
	 */
	private static generateSuggestions(error: AppError): string[] {
		const suggestions: string[] = [];

		switch (error.category) {
			case ErrorCategory.GITHUB_AUTH:
				suggestions.push(
					"Make sure you have a valid GitHub account",
					"Check if your GitHub token has the necessary permissions",
					"Try disconnecting and reconnecting your GitHub account"
				);
				break;

			case ErrorCategory.GITHUB_RATE_LIMIT:
				suggestions.push(
					"GitHub has usage limits to prevent abuse",
					"Rate limits typically reset every hour",
					"Consider upgrading to GitHub Pro for higher limits"
				);
				break;

			case ErrorCategory.REPOSITORY_ACCESS:
				suggestions.push(
					"Verify the repository URL is correct",
					"Check if the repository is public or if you have access",
					"Make sure the repository exists and is not deleted"
				);
				break;

			case ErrorCategory.AI_API_RATE_LIMIT:
				suggestions.push(
					"AI services have usage limits to ensure fair access",
					"Your request will be automatically retried",
					"Consider breaking large files into smaller pieces"
				);
				break;

			case ErrorCategory.AI_CONTEXT_LENGTH:
				suggestions.push(
					"The file is too large for the AI model to process at once",
					"Try splitting large files into smaller components",
					"Remove unnecessary comments or code before conversion"
				);
				break;

			case ErrorCategory.CONVERSION_SYNTAX:
				suggestions.push(
					"The generated code may have syntax issues",
					"This is usually resolved by regenerating the code",
					"Check if the source code has any unusual patterns"
				);
				break;

			case ErrorCategory.PREVIEW_CONTAINER_STARTUP:
				suggestions.push(
					"The preview environment failed to start",
					"This might be due to missing dependencies",
					"Try refreshing the page or restarting the preview"
				);
				break;

			case ErrorCategory.DATABASE_CONNECTION:
				suggestions.push(
					"There might be a temporary connectivity issue",
					"Check your internet connection",
					"The system will automatically retry the connection"
				);
				break;

			case ErrorCategory.NETWORK:
				suggestions.push(
					"Check your internet connection",
					"Try refreshing the page",
					"The issue might be temporary"
				);
				break;

			default:
				suggestions.push(
					"This appears to be a temporary issue",
					"Try refreshing the page or retrying the operation",
					"Contact support if the problem persists"
				);
		}

		return suggestions;
	}

	/**
	 * Generate user actions from recovery actions
	 */
	private static generateActions(
		recoveryActions: RecoveryAction[]
	): UserAction[] {
		const actions: UserAction[] = [];

		for (const recovery of recoveryActions) {
			switch (recovery.type) {
				case "retry":
					actions.push({
						label: recovery.automated ? "Retrying..." : "Retry",
						type: "retry",
						action: "retry",
						primary: true,
						disabled: recovery.automated,
						estimatedTime: recovery.estimatedTime
							? this.formatEstimatedTime(recovery.estimatedTime)
							: undefined,
					});
					break;

				case "manual":
					actions.push({
						label: recovery.description,
						type: "button",
						action: "manual_action",
						primary: false,
					});
					break;

				case "fallback":
					actions.push({
						label: "Try Alternative Approach",
						type: "button",
						action: "fallback",
						primary: false,
					});
					break;

				case "skip":
					actions.push({
						label: "Skip This Step",
						type: "button",
						action: "skip",
						primary: false,
					});
					break;
			}
		}

		// Always add a generic "Get Help" action
		actions.push({
			label: "Get Help",
			type: "link",
			action: "help",
			primary: false,
		});

		return actions;
	}

	/**
	 * Get base message template for error category
	 */
	private static getBaseMessage(category: ErrorCategory): {
		title: string;
		description: string;
	} {
		switch (category) {
			case ErrorCategory.GITHUB_AUTH:
				return {
					title: "GitHub Authentication Required",
					description: "Please connect your GitHub account to continue.",
				};

			case ErrorCategory.GITHUB_RATE_LIMIT:
				return {
					title: "GitHub Rate Limit Reached",
					description:
						"Too many requests to GitHub. Please wait a moment and try again.",
				};

			case ErrorCategory.REPOSITORY_ACCESS:
				return {
					title: "Repository Access Issue",
					description: "Unable to access the specified repository.",
				};

			case ErrorCategory.AI_API_RATE_LIMIT:
				return {
					title: "AI Service Busy",
					description:
						"The AI service is currently busy. Your request will be retried automatically.",
				};

			case ErrorCategory.AI_CONTEXT_LENGTH:
				return {
					title: "File Too Large",
					description:
						"The file is too large to process. Please try breaking it into smaller files.",
				};

			case ErrorCategory.CONVERSION_SYNTAX:
				return {
					title: "Code Generation Issue",
					description: "There was an issue generating the converted code.",
				};

			case ErrorCategory.PREVIEW_CONTAINER_STARTUP:
				return {
					title: "Preview Environment Issue",
					description: "Unable to start the preview environment.",
				};

			case ErrorCategory.DATABASE_CONNECTION:
				return {
					title: "Connection Issue",
					description: "Temporary connection issue. Retrying automatically.",
				};

			case ErrorCategory.NETWORK:
				return {
					title: "Network Issue",
					description: "Network connection problem detected.",
				};

			default:
				return {
					title: "Unexpected Error",
					description: "An unexpected error occurred. Please try again.",
				};
		}
	}

	/**
	 * Map error severity to user-friendly severity
	 */
	private static mapSeverityToUserSeverity(
		severity: string
	): "info" | "warning" | "error" | "critical" {
		switch (severity) {
			case "LOW":
				return "info";
			case "MEDIUM":
				return "warning";
			case "HIGH":
				return "error";
			case "CRITICAL":
				return "critical";
			default:
				return "error";
		}
	}

	/**
	 * Get appropriate icon for error category
	 */
	private static getIconForCategory(category: ErrorCategory): string {
		switch (category) {
			case ErrorCategory.GITHUB_AUTH:
			case ErrorCategory.GITHUB_API:
			case ErrorCategory.GITHUB_RATE_LIMIT:
			case ErrorCategory.REPOSITORY_ACCESS:
				return "🐙"; // GitHub octopus

			case ErrorCategory.AI_API_RATE_LIMIT:
			case ErrorCategory.AI_MODEL_FAILURE:
			case ErrorCategory.AI_CONTEXT_LENGTH:
			case ErrorCategory.AI_TIMEOUT:
				return "🤖"; // Robot for AI

			case ErrorCategory.CONVERSION_SYNTAX:
			case ErrorCategory.CONVERSION_DEPENDENCY:
			case ErrorCategory.CONVERSION_INCOMPATIBLE:
				return "🔄"; // Conversion arrows

			case ErrorCategory.PREVIEW_CONTAINER_STARTUP:
			case ErrorCategory.PREVIEW_RESOURCE_EXHAUSTION:
				return "👁️"; // Eye for preview

			case ErrorCategory.DATABASE_CONNECTION:
				return "🗄️"; // Database

			case ErrorCategory.NETWORK:
				return "🌐"; // Globe for network

			case ErrorCategory.FILE_SYSTEM:
				return "📁"; // Folder

			case ErrorCategory.VALIDATION:
				return "⚠️"; // Warning

			default:
				return "❌"; // X for generic error
		}
	}

	/**
	 * Format estimated time for display
	 */
	private static formatEstimatedTime(ms: number): string {
		if (ms < 1000) {
			return "less than a second";
		} else if (ms < 60000) {
			return `${Math.ceil(ms / 1000)} seconds`;
		} else if (ms < 3600000) {
			return `${Math.ceil(ms / 60000)} minutes`;
		} else {
			return `${Math.ceil(ms / 3600000)} hours`;
		}
	}
}

/**
 * Predefined error messages for common scenarios
 */
export const CommonErrorMessages = {
	NETWORK_OFFLINE: {
		title: "You're Offline",
		description: "Please check your internet connection and try again.",
		suggestions: [
			"Check your WiFi or ethernet connection",
			"Try refreshing the page",
			"Contact your network administrator if the issue persists",
		],
		actions: [
			{
				label: "Retry",
				type: "retry" as const,
				action: "retry",
				primary: true,
			},
		],
		severity: "warning" as const,
		icon: "📡",
	},

	MAINTENANCE_MODE: {
		title: "Scheduled Maintenance",
		description: "The service is temporarily unavailable for maintenance.",
		suggestions: [
			"Maintenance is usually brief",
			"Try again in a few minutes",
			"Check our status page for updates",
		],
		actions: [
			{
				label: "Check Status",
				type: "link" as const,
				action: "status",
				primary: true,
			},
			{
				label: "Retry",
				type: "retry" as const,
				action: "retry",
				primary: false,
			},
		],
		severity: "info" as const,
		icon: "🔧",
	},

	QUOTA_EXCEEDED: {
		title: "Usage Limit Reached",
		description: "You've reached your usage limit for this period.",
		suggestions: [
			"Limits reset periodically",
			"Consider upgrading your plan",
			"Try again later",
		],
		actions: [
			{
				label: "Upgrade Plan",
				type: "link" as const,
				action: "upgrade",
				primary: true,
			},
			{
				label: "Learn More",
				type: "link" as const,
				action: "learn_limits",
				primary: false,
			},
		],
		severity: "warning" as const,
		icon: "📊",
	},
};
