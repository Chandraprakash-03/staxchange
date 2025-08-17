import { Router, Request, Response } from "express";
import {
	asyncHandler,
	authenticateToken,
	validateContentType,
} from "@/middleware";
import { AuthService } from "@/services/auth";

const router = Router();

/**
 * GitHub OAuth initiation
 * GET /api/auth/github
 */
router.get(
	"/github",
	asyncHandler(async (req: Request, res: Response) => {
		const redirectUrl = AuthService.getGitHubAuthUrl();

		res.json({
			success: true,
			data: {
				authUrl: redirectUrl,
			},
		});
	})
);

/**
 * GitHub OAuth callback
 * GET /api/auth/callback?code=...&state=...
 */
router.get(
	"/callback",
	asyncHandler(async (req: Request, res: Response) => {
		const { code, state } = req.query;

		if (!code || typeof code !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_AUTH_CODE",
					message: "Authorization code is required",
					userMessage: "Authentication failed. Please try again.",
				},
			});
		}

		const result = await AuthService.authenticateWithGitHub(
			code,
			state as string
		);

		res.json({
			success: true,
			data: {
				user: {
					id: result.user.id,
					githubId: result.user.githubId,
					username: result.user.username,
					email: result.user.email,
					avatarUrl: result.user.avatarUrl,
				},
				token: result.token,
				expiresAt: result.expiresAt,
			},
		});
	})
);

/**
 * Get current user information
 * GET /api/auth/me
 */
router.get(
	"/me",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;

		res.json({
			success: true,
			data: {
				user: {
					id: user.id,
					githubId: user.githubId,
					username: user.username,
					email: user.email,
					avatarUrl: user.avatarUrl,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt,
				},
			},
		});
	})
);

/**
 * Refresh authentication token
 * POST /api/auth/refresh
 */
router.post(
	"/refresh",
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { refreshToken } = req.body;

		if (!refreshToken || typeof refreshToken !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_REFRESH_TOKEN",
					message: "Refresh token is required",
					userMessage: "Please log in again.",
				},
			});
		}

		const result = await AuthService.refreshUserToken(refreshToken);

		res.json({
			success: true,
			data: {
				token: result.token,
				expiresAt: result.expiresAt,
				refreshToken: result.refreshToken,
			},
		});
	})
);

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post(
	"/logout",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const token = req.token!;

		await AuthService.invalidateToken(token);

		res.json({
			success: true,
			data: {
				message: "Successfully logged out",
			},
		});
	})
);

/**
 * Validate token endpoint (for client-side token validation)
 * POST /api/auth/validate
 */
router.post(
	"/validate",
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { token } = req.body;

		if (!token || typeof token !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Token is required",
					userMessage: "Please provide a valid token.",
				},
			});
		}

		const user = await AuthService.getUserFromToken(token);

		if (!user) {
			return res.status(401).json({
				success: false,
				error: {
					code: "INVALID_TOKEN",
					message: "Token is invalid or expired",
					userMessage: "Please log in again.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				valid: true,
				user: {
					id: user.id,
					githubId: user.githubId,
					username: user.username,
					email: user.email,
					avatarUrl: user.avatarUrl,
				},
			},
		});
	})
);

/**
 * Get GitHub user information (requires valid GitHub token)
 * GET /api/auth/github/user
 */
router.get(
	"/github/user",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;

		if (!user.accessToken) {
			return res.status(401).json({
				success: false,
				error: {
					code: "MISSING_GITHUB_TOKEN",
					message: "GitHub access token not found",
					userMessage: "Please re-authenticate with GitHub.",
				},
			});
		}

		const githubUser = await AuthService.getGitHubUser(user.accessToken);

		res.json({
			success: true,
			data: {
				githubUser,
			},
		});
	})
);

/**
 * Revoke GitHub access token
 * POST /api/auth/github/revoke
 */
router.post(
	"/github/revoke",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;

		if (!user.accessToken) {
			return res.status(400).json({
				success: false,
				error: {
					code: "NO_GITHUB_TOKEN",
					message: "No GitHub token to revoke",
					userMessage: "GitHub access is already revoked.",
				},
			});
		}

		await AuthService.revokeGitHubAccess(user.accessToken!);

		res.json({
			success: true,
			data: {
				message: "GitHub access token revoked successfully",
			},
		});
	})
);

export default router;
