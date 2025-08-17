import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Enable standalone output for Docker
	output: "standalone",

	// Optimize for production
	poweredByHeader: false,

	// Enable compression
	compress: true,

	// Configure headers for security
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "origin-when-cross-origin",
					},
				],
			},
		];
	},

	// Configure redirects if needed
	async redirects() {
		return [];
	},

	// Experimental features for better performance
	experimental: {
		// Enable server components
		serverComponentsExternalPackages: ["prisma", "@prisma/client"],
	},
};

export default nextConfig;
