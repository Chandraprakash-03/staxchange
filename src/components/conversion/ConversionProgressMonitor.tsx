"use client";

import React, { useState, useEffect, useRef } from "react";
import {
	Project,
	ConversionJob,
	ConversionTask,
	JobProgressUpdate,
	LogEntry,
} from "@/types";
import {
	ProgressTracker,
	ConversionLogs,
	CodeDiffViewer,
	TaskList,
} from "./index";

interface ConversionProgressMonitorProps {
	project: Project;
	conversionJob: ConversionJob;
	onBack: () => void;
	onComplete: () => void;
	onPause: () => void;
	onResume: () => void;
	onCancel: () => void;
}

export function ConversionProgressMonitor({
	project,
	conversionJob: initialJob,
	onBack,
	onComplete,
	onPause,
	onResume,
	onCancel,
}: ConversionProgressMonitorProps) {
	const [conversionJob, setConversionJob] = useState<ConversionJob>(initialJob);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [selectedTask, setSelectedTask] = useState<ConversionTask | null>(null);
	const [activeTab, setActiveTab] = useState<
		"overview" | "tasks" | "logs" | "diff"
	>("overview");
	const wsRef = useRef<WebSocket | null>(null);

	// WebSocket connection for real-time updates
	useEffect(() => {
		const connectWebSocket = () => {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const wsUrl = `${protocol}//${window.location.host}/api/ws/conversion/${conversionJob.id}`;

			wsRef.current = new WebSocket(wsUrl);

			wsRef.current.onopen = () => {
				console.log("WebSocket connected for conversion monitoring");
			};

			wsRef.current.onmessage = (event) => {
				try {
					const update: JobProgressUpdate = JSON.parse(event.data);
					handleProgressUpdate(update);
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
				}
			};

			wsRef.current.onclose = () => {
				console.log("WebSocket disconnected, attempting to reconnect...");
				// Reconnect after 3 seconds
				setTimeout(connectWebSocket, 3000);
			};

			wsRef.current.onerror = (error) => {
				console.error("WebSocket error:", error);
			};
		};

		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [conversionJob.id]);

	// Handle progress updates from WebSocket
	const handleProgressUpdate = (update: JobProgressUpdate) => {
		if (update.jobId === conversionJob.id) {
			setConversionJob((prev) => ({
				...prev,
				progress: update.progress,
				status: update.status as any,
				currentTask: update.message,
			}));

			// Add log entry for the update
			const logEntry: LogEntry = {
				id: `${Date.now()}-${Math.random()}`,
				timestamp: new Date(),
				level: update.status === "failed" ? "error" : "info",
				message: update.message,
				source: "system",
			};

			setLogs((prev) => [...prev, logEntry]);

			// Auto-complete when job is done
			if (update.status === "completed") {
				setTimeout(() => {
					onComplete();
				}, 2000);
			}
		}
	};

	// Poll for updates as fallback
	useEffect(() => {
		const pollInterval = setInterval(async () => {
			try {
				const response = await fetch(`/api/projects/${project.id}/conversion`);
				const result = await response.json();

				if (result.success && result.data) {
					setConversionJob(result.data);
				}
			} catch (error) {
				console.error("Error polling conversion status:", error);
			}
		}, 5000);

		return () => clearInterval(pollInterval);
	}, [project.id]);

	const handlePauseResume = async () => {
		try {
			const action = conversionJob.status === "running" ? "pause" : "resume";
			const response = await fetch(
				`/api/projects/${project.id}/conversion/${action}`,
				{
					method: "POST",
				}
			);

			const result = await response.json();
			if (result.success) {
				setConversionJob((prev) => ({
					...prev,
					status: action === "pause" ? "paused" : "running",
				}));
			}
		} catch (error) {
			console.error(
				`Error ${
					conversionJob.status === "running" ? "pausing" : "resuming"
				} conversion:`,
				error
			);
		}
	};

	const handleCancel = async () => {
		if (
			confirm(
				"Are you sure you want to cancel the conversion? This action cannot be undone."
			)
		) {
			try {
				const response = await fetch(`/api/projects/${project.id}/conversion`, {
					method: "DELETE",
				});

				const result = await response.json();
				if (result.success) {
					onBack();
				}
			} catch (error) {
				console.error("Error canceling conversion:", error);
			}
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "text-green-600";
			case "failed":
				return "text-red-600";
			case "running":
				return "text-blue-600";
			case "paused":
				return "text-yellow-600";
			default:
				return "text-gray-600";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return (
					<svg
						className="w-5 h-5 text-green-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					</svg>
				);
			case "failed":
				return (
					<svg
						className="w-5 h-5 text-red-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clipRule="evenodd"
						/>
					</svg>
				);
			case "running":
				return (
					<div className="w-5 h-5">
						<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
					</div>
				);
			case "paused":
				return (
					<svg
						className="w-5 h-5 text-yellow-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				);
			default:
				return (
					<svg
						className="w-5 h-5 text-gray-500"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
							clipRule="evenodd"
						/>
					</svg>
				);
		}
	};

	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
			{/* Header */}
			<div className="border-b border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							Converting {project.name}
						</h1>
						<p className="text-gray-600 mt-1">
							{project.originalTechStack.language} →{" "}
							{project.targetTechStack?.language}
						</p>
					</div>
					<div className="flex items-center space-x-3">
						<div
							className={`flex items-center space-x-2 ${getStatusColor(
								conversionJob.status
							)}`}
						>
							{getStatusIcon(conversionJob.status)}
							<span className="font-medium capitalize">
								{conversionJob.status}
							</span>
						</div>
						<div className="flex space-x-2">
							{conversionJob.status === "running" ||
							conversionJob.status === "paused" ? (
								<button
									onClick={handlePauseResume}
									className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
								>
									{conversionJob.status === "running" ? "Pause" : "Resume"}
								</button>
							) : null}
							{conversionJob.status !== "completed" &&
							conversionJob.status !== "failed" ? (
								<button
									onClick={handleCancel}
									className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
								>
									Cancel
								</button>
							) : null}
							<button
								onClick={onBack}
								className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
							>
								Back
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Progress Overview */}
			<div className="p-6 border-b border-gray-200">
				<ProgressTracker conversionJob={conversionJob} />
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200">
				<nav className="flex space-x-8 px-6">
					{[
						{ id: "overview", label: "Overview" },
						{ id: "tasks", label: "Tasks" },
						{ id: "logs", label: "Logs" },
						{ id: "diff", label: "Code Changes" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={`py-4 px-1 border-b-2 font-medium text-sm ${
								activeTab === tab.id
									? "border-blue-500 text-blue-600"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}`}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="p-6">
				{activeTab === "overview" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-900">Progress</h3>
								<p className="text-2xl font-bold text-blue-600 mt-1">
									{conversionJob.progress}%
								</p>
							</div>
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-900">Current Task</h3>
								<p className="text-sm text-gray-600 mt-1">
									{conversionJob.currentTask || "Initializing..."}
								</p>
							</div>
							<div className="bg-gray-50 p-4 rounded-lg">
								<h3 className="font-medium text-gray-900">Estimated Time</h3>
								<p className="text-sm text-gray-600 mt-1">
									{conversionJob.plan.estimatedDuration} minutes
								</p>
							</div>
						</div>
						{conversionJob.currentTask && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<h3 className="font-medium text-blue-900">Current Activity</h3>
								<p className="text-blue-700 mt-1">
									{conversionJob.currentTask}
								</p>
							</div>
						)}
					</div>
				)}

				{activeTab === "tasks" && (
					<TaskList
						tasks={conversionJob.plan.tasks}
						onTaskSelect={setSelectedTask}
						selectedTask={selectedTask}
					/>
				)}

				{activeTab === "logs" && <ConversionLogs logs={logs} />}

				{activeTab === "diff" && (
					<CodeDiffViewer
						conversionJob={conversionJob}
						selectedTask={selectedTask}
					/>
				)}
			</div>
		</div>
	);
}
