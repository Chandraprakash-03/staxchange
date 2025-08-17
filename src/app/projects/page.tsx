"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { useNavigation } from "@/hooks/useNavigation";

export default function ProjectsPage() {
	const { projects, conversionHistory, isLoading, setLoading } = useAppStore();

	const { navigateToProject, navigateToImport } = useNavigation();

	useEffect(() => {
		// TODO: Fetch projects from API if needed
		setLoading(false);
	}, [setLoading]);

	const getProjectStatus = (projectId: string) => {
		const recentConversion = conversionHistory.find(
			(c) => c.projectId === projectId
		);
		if (recentConversion) {
			return recentConversion.status;
		}
		return "imported";
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "running":
				return "bg-blue-100 text-blue-800";
			case "failed":
				return "bg-red-100 text-red-800";
			case "paused":
				return "bg-yellow-100 text-yellow-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "completed":
				return "Converted";
			case "running":
				return "Converting";
			case "failed":
				return "Failed";
			case "paused":
				return "Paused";
			default:
				return "Imported";
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading projects...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 mb-2">
								Your Projects
							</h1>
							<p className="text-gray-600">
								Manage and track your tech stack conversion projects
							</p>
						</div>

						<button
							onClick={navigateToImport}
							className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
						>
							Import New Project
						</button>
					</div>

					{/* Projects Grid */}
					{projects.length === 0 ? (
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									className="w-8 h-8 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<h2 className="text-xl font-semibold text-gray-900 mb-2">
								No Projects Yet
							</h2>
							<p className="text-gray-600 mb-6">
								Import your first GitHub repository to get started with
								AI-powered tech stack conversion.
							</p>
							<button
								onClick={navigateToImport}
								className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
							>
								Import Your First Project
							</button>
						</div>
					) : (
						<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
							{projects.map((project) => {
								const status = getProjectStatus(project.id);

								return (
									<div
										key={project.id}
										className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
										onClick={() => navigateToProject(project.id)}
									>
										<div className="flex items-start justify-between mb-4">
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-gray-900 mb-1">
													{project.name}
												</h3>
												<p className="text-sm text-gray-500 truncate">
													{project.githubUrl}
												</p>
											</div>

											<span
												className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
													status
												)}`}
											>
												{getStatusText(status)}
											</span>
										</div>

										<div className="space-y-2 mb-4">
											<div className="flex items-center justify-between text-sm">
												<span className="text-gray-600">From:</span>
												<span className="font-medium text-gray-900">
													{project.originalTechStack.language}
													{project.originalTechStack.framework &&
														` + ${project.originalTechStack.framework}`}
												</span>
											</div>

											{project.targetTechStack && (
												<div className="flex items-center justify-between text-sm">
													<span className="text-gray-600">To:</span>
													<span className="font-medium text-gray-900">
														{project.targetTechStack.language}
														{project.targetTechStack.framework &&
															` + ${project.targetTechStack.framework}`}
													</span>
												</div>
											)}
										</div>

										<div className="flex items-center justify-between text-xs text-gray-500">
											<span>
												Created {project.createdAt.toLocaleDateString()}
											</span>

											{status === "completed" && (
												<Link
													href={`/projects/${project.id}/preview`}
													className="text-blue-600 hover:text-blue-700 font-medium"
													onClick={(e) => e.stopPropagation()}
												>
													View Preview →
												</Link>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
