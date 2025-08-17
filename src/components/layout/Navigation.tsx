"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store";
import { useNavigation } from "@/hooks/useNavigation";

export function Navigation() {
	const pathname = usePathname();
	const { user, isAuthenticated, projects } = useAppStore();
	const { navigateHome, navigateToImport } = useNavigation();

	const isActive = (path: string) => {
		if (path === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(path);
	};

	const navItems = [
		{ href: "/", label: "Home", active: isActive("/") && pathname === "/" },
		{ href: "/projects", label: "Projects", active: isActive("/projects") },
		{ href: "/import", label: "Import", active: isActive("/import") },
	];

	return (
		<nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					{/* Logo */}
					<Link
						href="/"
						className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
					>
						<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
							<svg
								className="w-5 h-5 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<span>AI Tech Stack Converter</span>
					</Link>

					{/* Navigation Links */}
					<div className="hidden md:flex items-center space-x-8">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={`font-medium transition-colors ${
									item.active
										? "text-blue-600 border-b-2 border-blue-600 pb-1"
										: "text-gray-600 hover:text-gray-900"
								}`}
							>
								{item.label}
							</Link>
						))}
					</div>

					{/* Right Side Actions */}
					<div className="flex items-center space-x-4">
						{/* Project Count Badge */}
						{projects.length > 0 && (
							<Link
								href="/projects"
								className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
							>
								<div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
									{projects.length}
								</div>
								<span className="hidden sm:inline">Projects</span>
							</Link>
						)}

						{/* Quick Import Button */}
						<button
							onClick={navigateToImport}
							className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
						>
							Import Project
						</button>

						{/* User Menu (placeholder for future auth) */}
						{isAuthenticated && user ? (
							<div className="flex items-center space-x-2">
								<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
									<span className="text-sm font-medium text-gray-700">
										{user.name?.charAt(0) || "U"}
									</span>
								</div>
							</div>
						) : (
							<button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
								Sign In
							</button>
						)}
					</div>

					{/* Mobile Menu Button */}
					<div className="md:hidden">
						<button className="text-gray-600 hover:text-gray-900">
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Breadcrumb for project pages */}
			{pathname.startsWith("/projects/") && pathname !== "/projects" && (
				<div className="border-t border-gray-100 bg-gray-50">
					<div className="container mx-auto px-4 py-2">
						<div className="flex items-center space-x-2 text-sm text-gray-600">
							<Link href="/projects" className="hover:text-gray-900">
								Projects
							</Link>
							<span>/</span>
							<span className="text-gray-900">
								{pathname.includes("/convert")
									? "Convert"
									: pathname.includes("/preview")
									? "Preview"
									: "Project Details"}
							</span>
						</div>
					</div>
				</div>
			)}
		</nav>
	);
}
