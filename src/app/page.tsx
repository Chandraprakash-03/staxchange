"use client";

import Link from "next/link";
import { useNavigation } from "@/hooks/useNavigation";
import { useAppStore } from "@/store";

export default function Home() {
	const { navigateToImport } = useNavigation();
	const { projects } = useAppStore();
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="container mx-auto px-4 py-16">
				<div className="max-w-4xl mx-auto text-center">
					{/* Hero Section */}
					<div className="mb-16">
						<h1 className="text-5xl font-bold text-gray-900 mb-6">
							AI Tech Stack Converter
						</h1>
						<p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
							Transform your projects between any technology stacks using
							AI-powered conversion. Import from GitHub, select your target
							stack, and let AI do the heavy lifting.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button
								onClick={navigateToImport}
								className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
							>
								Import Your Project
							</button>
							<Link
								href="/demo"
								className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors border border-blue-200 shadow-lg"
							>
								View Demo
							</Link>
						</div>

						{/* Show recent projects if any */}
						{projects.length > 0 && (
							<div className="mt-8">
								<Link
									href="/projects"
									className="text-blue-600 hover:text-blue-700 font-medium"
								>
									View Your {projects.length} Project
									{projects.length !== 1 ? "s" : ""} →
								</Link>
							</div>
						)}
					</div>

					{/* Features Grid */}
					<div className="grid md:grid-cols-3 gap-8 mb-16">
						<div className="bg-white p-6 rounded-lg shadow-md">
							<div className="text-3xl mb-4">🚀</div>
							<h3 className="text-xl font-semibold mb-2">Easy Import</h3>
							<p className="text-gray-600">
								Simply paste your GitHub repository URL and we'll analyze your
								project structure automatically.
							</p>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-md">
							<div className="text-3xl mb-4">🤖</div>
							<h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
							<p className="text-gray-600">
								Our AI agents understand your code and convert it while
								maintaining functionality and best practices.
							</p>
						</div>

						<div className="bg-white p-6 rounded-lg shadow-md">
							<div className="text-3xl mb-4">👀</div>
							<h3 className="text-xl font-semibold mb-2">Live Preview</h3>
							<p className="text-gray-600">
								See your converted project running live before downloading, with
								real-time editing capabilities.
							</p>
						</div>
					</div>

					{/* Supported Technologies */}
					<div className="bg-white rounded-lg shadow-md p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-6">
							Supported Technologies
						</h2>

						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
							<div>
								<h4 className="font-semibold text-gray-900 mb-2">Frontend</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>React</li>
									<li>Vue.js</li>
									<li>Angular</li>
									<li>Svelte</li>
									<li>Next.js</li>
								</ul>
							</div>

							<div>
								<h4 className="font-semibold text-gray-900 mb-2">Backend</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>Node.js</li>
									<li>Python</li>
									<li>Java</li>
									<li>Go</li>
									<li>PHP</li>
								</ul>
							</div>

							<div>
								<h4 className="font-semibold text-gray-900 mb-2">Databases</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>PostgreSQL</li>
									<li>MySQL</li>
									<li>MongoDB</li>
									<li>SQLite</li>
									<li>Redis</li>
								</ul>
							</div>

							<div>
								<h4 className="font-semibold text-gray-900 mb-2">Deployment</h4>
								<ul className="text-sm text-gray-600 space-y-1">
									<li>Docker</li>
									<li>Vercel</li>
									<li>Netlify</li>
									<li>AWS</li>
									<li>Heroku</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
