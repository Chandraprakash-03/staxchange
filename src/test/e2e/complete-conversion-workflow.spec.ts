import { test, expect } from "@playwright/test";

test.describe("Complete Conversion Workflow", () => {
	test.beforeEach(async ({ page }) => {
		// Mock GitHub OAuth for testing
		await page.route("**/api/auth/github", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: "test-user-123",
						username: "testuser",
						email: "test@example.com",
					},
					token: "test-jwt-token",
				}),
			});
		});

		// Mock GitHub repository validation
		await page.route("**/api/projects/validate", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					isValid: true,
					warnings: [],
					errors: [],
				}),
			});
		});

		// Mock project import
		await page.route("**/api/projects/import", async (route) => {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					project: {
						id: "test-project-123",
						name: "test-react-app",
						githubUrl: "https://github.com/testuser/test-react-app",
						originalTechStack: {
							language: "JavaScript",
							framework: "React",
							buildTool: "Webpack",
							packageManager: "npm",
						},
						status: "imported",
					},
					importResult: {
						status: "success",
						detectedTechnologies: {
							language: "JavaScript",
							framework: "React",
						},
						structure: {
							name: "test-react-app",
							type: "directory",
							children: [],
						},
					},
				}),
			});
		});

		// Mock conversion start
		await page.route("**/api/conversion/start", async (route) => {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					job: {
						id: "conversion-job-123",
						projectId: "test-project-123",
						status: "running",
						progress: 0,
						currentTask: "Analyzing project structure",
					},
				}),
			});
		});

		// Mock conversion status updates
		let progressCounter = 0;
		await page.route("**/api/conversion/*/status", async (route) => {
			progressCounter += 10;
			const isComplete = progressCounter >= 100;

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					job: {
						id: "conversion-job-123",
						status: isComplete ? "completed" : "running",
						progress: Math.min(progressCounter, 100),
						currentTask: isComplete
							? "Conversion completed"
							: `Converting files (${progressCounter}%)`,
						results: isComplete
							? [
									{
										file: "src/App.vue",
										status: "converted",
										content: "<!-- Converted Vue component -->",
									},
							  ]
							: [],
					},
				}),
			});
		});
	});

	test("should complete full project import and conversion workflow", async ({
		page,
	}) => {
		// Step 1: Navigate to home page
		await page.goto("/");
		await expect(page.locator("h1")).toContainText("AI Tech Stack Converter");

		// Step 2: Start project import
		await page.click('button:has-text("Import Your Project")');
		await expect(page).toHaveURL("/import");

		// Step 3: Enter GitHub repository URL
		const githubUrlInput = page.locator('input[placeholder*="GitHub"]');
		await githubUrlInput.fill("https://github.com/testuser/test-react-app");

		// Step 4: Wait for validation and submit
		await expect(
			page.locator("text=Repository is valid and accessible")
		).toBeVisible({ timeout: 5000 });

		await page.click('button:has-text("Import Repository")');

		// Step 5: Wait for import completion and navigate to project
		await expect(
			page.locator("text=Import completed successfully")
		).toBeVisible({
			timeout: 10000,
		});

		await page.click('button:has-text("Continue to Project")');
		await expect(page).toHaveURL(/\/projects\/test-project-123/);

		// Step 6: Verify project details are displayed
		await expect(page.locator("h1")).toContainText("test-react-app");
		await expect(page.locator("text=JavaScript")).toBeVisible();
		await expect(page.locator("text=React")).toBeVisible();

		// Step 7: Start tech stack selection
		await page.click('button:has-text("Convert Project")');
		await expect(page).toHaveURL(/\/projects\/test-project-123\/convert/);

		// Step 8: Select target tech stack
		await expect(page.locator("text=Select Target Tech Stack")).toBeVisible();

		// Select TypeScript as target language
		const languageSelect = page.locator("select").first();
		await languageSelect.selectOption("TypeScript");

		// Select Vue as target framework
		const frameworkSelect = page.locator("select").nth(1);
		await frameworkSelect.selectOption("Vue");

		// Select Vite as build tool
		const buildToolSelect = page.locator("select").nth(2);
		await buildToolSelect.selectOption("Vite");

		// Step 9: Review conversion plan
		await page.click('button:has-text("Generate Conversion Plan")');
		await expect(page.locator("text=Conversion Plan")).toBeVisible();
		await expect(page.locator("text=Estimated Duration")).toBeVisible();

		// Step 10: Start conversion
		await page.click('button:has-text("Start Conversion")');
		await expect(page).toHaveURL(/\/projects\/test-project-123\/conversion/);

		// Step 11: Monitor conversion progress
		await expect(page.locator("text=Conversion in Progress")).toBeVisible();
		await expect(
			page.locator("text=Analyzing project structure")
		).toBeVisible();

		// Wait for progress updates
		await expect(page.locator("text=Converting files")).toBeVisible({
			timeout: 5000,
		});

		// Step 12: Wait for conversion completion
		await expect(page.locator("text=Conversion completed")).toBeVisible({
			timeout: 15000,
		});

		await expect(page.locator("text=100%")).toBeVisible();

		// Step 13: Navigate to preview
		await page.click('button:has-text("View Preview")');
		await expect(page).toHaveURL(/\/projects\/test-project-123\/preview/);

		// Step 14: Verify preview interface
		await expect(page.locator("text=Live Preview")).toBeVisible();
		await expect(page.locator(".monaco-editor")).toBeVisible({
			timeout: 10000,
		});

		// Step 15: Test code editing in preview
		const editor = page.locator(".monaco-editor");
		await editor.click();
		await page.keyboard.type("// Test edit");

		// Step 16: Download converted project
		await page.click('button:has-text("Download Project")');

		// Verify download dialog appears
		await expect(page.locator("text=Download Converted Project")).toBeVisible();
		await expect(page.locator("text=Setup Instructions")).toBeVisible();

		// Complete download
		const downloadPromise = page.waitForDownload();
		await page.click('button:has-text("Download ZIP")');
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toContain("test-react-app-converted");
	});

	test("should handle conversion errors gracefully", async ({ page }) => {
		// Mock conversion error
		await page.route("**/api/conversion/start", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					error: "AI service temporarily unavailable",
				}),
			});
		});

		// Navigate through import flow
		await page.goto("/import");
		const githubUrlInput = page.locator('input[placeholder*="GitHub"]');
		await githubUrlInput.fill("https://github.com/testuser/test-react-app");

		await expect(
			page.locator("text=Repository is valid and accessible")
		).toBeVisible();

		await page.click('button:has-text("Import Repository")');
		await page.click('button:has-text("Continue to Project")');
		await page.click('button:has-text("Convert Project")');

		// Select tech stack
		const languageSelect = page.locator("select").first();
		await languageSelect.selectOption("TypeScript");

		const frameworkSelect = page.locator("select").nth(1);
		await frameworkSelect.selectOption("Vue");

		// Try to start conversion
		await page.click('button:has-text("Generate Conversion Plan")');
		await page.click('button:has-text("Start Conversion")');

		// Verify error handling
		await expect(
			page.locator("text=AI service temporarily unavailable")
		).toBeVisible();
		await expect(
			page.locator('button:has-text("Retry Conversion")')
		).toBeVisible();
	});

	test("should support pausing and resuming conversions", async ({ page }) => {
		// Mock pause/resume endpoints
		await page.route("**/api/conversion/*/pause", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					job: {
						id: "conversion-job-123",
						status: "paused",
						progress: 45,
						currentTask: "Conversion paused",
					},
				}),
			});
		});

		await page.route("**/api/conversion/*/resume", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					job: {
						id: "conversion-job-123",
						status: "running",
						progress: 45,
						currentTask: "Resuming conversion",
					},
				}),
			});
		});

		// Navigate through workflow to conversion
		await page.goto("/import");
		const githubUrlInput = page.locator('input[placeholder*="GitHub"]');
		await githubUrlInput.fill("https://github.com/testuser/test-react-app");

		await page.click('button:has-text("Import Repository")');
		await page.click('button:has-text("Continue to Project")');
		await page.click('button:has-text("Convert Project")');

		// Select tech stack and start conversion
		const languageSelect = page.locator("select").first();
		await languageSelect.selectOption("TypeScript");

		await page.click('button:has-text("Generate Conversion Plan")');
		await page.click('button:has-text("Start Conversion")');

		// Wait for conversion to start
		await expect(page.locator("text=Conversion in Progress")).toBeVisible();

		// Pause conversion
		await page.click('button:has-text("Pause")');
		await expect(page.locator("text=Conversion paused")).toBeVisible();
		await expect(page.locator('button:has-text("Resume")')).toBeVisible();

		// Resume conversion
		await page.click('button:has-text("Resume")');
		await expect(page.locator("text=Resuming conversion")).toBeVisible();
		await expect(page.locator('button:has-text("Pause")')).toBeVisible();
	});

	test("should handle large project conversions with progress tracking", async ({
		page,
	}) => {
		// Mock large project import
		await page.route("**/api/projects/import", async (route) => {
			await route.fulfill({
				status: 201,
				contentType: "application/json",
				body: JSON.stringify({
					project: {
						id: "large-project-123",
						name: "large-react-app",
						githubUrl: "https://github.com/testuser/large-react-app",
						originalTechStack: {
							language: "JavaScript",
							framework: "React",
						},
						status: "imported",
					},
					importResult: {
						status: "success",
						detectedTechnologies: {
							language: "JavaScript",
							framework: "React",
						},
						fileCount: 150,
						estimatedConversionTime: 1800, // 30 minutes
					},
				}),
			});
		});

		// Mock detailed progress updates for large project
		let detailedProgress = 0;
		await page.route("**/api/conversion/*/status", async (route) => {
			detailedProgress += 2;
			const currentFile = Math.floor(detailedProgress / 2);

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					job: {
						id: "large-conversion-job-123",
						status: detailedProgress >= 100 ? "completed" : "running",
						progress: Math.min(detailedProgress, 100),
						currentTask: `Converting file ${currentFile}/150: src/components/Component${currentFile}.js`,
						estimatedTimeRemaining: Math.max(0, 1800 - detailedProgress * 18),
						filesProcessed: currentFile,
						totalFiles: 150,
					},
				}),
			});
		});

		// Navigate through workflow
		await page.goto("/import");
		const githubUrlInput = page.locator('input[placeholder*="GitHub"]');
		await githubUrlInput.fill("https://github.com/testuser/large-react-app");

		await page.click('button:has-text("Import Repository")');
		await page.click('button:has-text("Continue to Project")');

		// Verify large project warning
		await expect(
			page.locator("text=This is a large project (150 files)")
		).toBeVisible();
		await expect(
			page.locator("text=Estimated conversion time: 30 minutes")
		).toBeVisible();

		await page.click('button:has-text("Convert Project")');

		// Select tech stack and start conversion
		const languageSelect = page.locator("select").first();
		await languageSelect.selectOption("TypeScript");

		await page.click('button:has-text("Generate Conversion Plan")');
		await page.click('button:has-text("Start Conversion")');

		// Verify detailed progress tracking
		await expect(page.locator("text=Converting file")).toBeVisible();
		await expect(page.locator("text=files processed")).toBeVisible();
		await expect(page.locator("text=Estimated time remaining")).toBeVisible();

		// Verify progress bar updates
		const progressBar = page.locator('[role="progressbar"]');
		await expect(progressBar).toBeVisible();

		// Wait for some progress
		await expect(page.locator("text=10%")).toBeVisible({ timeout: 5000 });
		await expect(page.locator("text=20%")).toBeVisible({ timeout: 5000 });
	});

	test("should support multiple tech stack combinations", async ({ page }) => {
		const techStackCombinations = [
			{
				from: { language: "JavaScript", framework: "React" },
				to: { language: "TypeScript", framework: "Vue" },
			},
			{
				from: { language: "Python", framework: "Django" },
				to: { language: "JavaScript", framework: "Next.js" },
			},
			{
				from: { language: "Java", framework: "Spring" },
				to: { language: "TypeScript", framework: "NestJS" },
			},
		];

		for (const combination of techStackCombinations) {
			// Mock project with specific tech stack
			await page.route("**/api/projects/import", async (route) => {
				await route.fulfill({
					status: 201,
					contentType: "application/json",
					body: JSON.stringify({
						project: {
							id: `project-${combination.from.framework}`,
							name: `${combination.from.framework.toLowerCase()}-app`,
							originalTechStack: combination.from,
							status: "imported",
						},
						importResult: {
							status: "success",
							detectedTechnologies: combination.from,
						},
					}),
				});
			});

			// Navigate through conversion flow
			await page.goto("/import");
			const githubUrlInput = page.locator('input[placeholder*="GitHub"]');
			await githubUrlInput.fill(
				`https://github.com/testuser/${combination.from.framework.toLowerCase()}-app`
			);

			await page.click('button:has-text("Import Repository")');
			await page.click('button:has-text("Continue to Project")');

			// Verify original tech stack detection
			await expect(
				page.locator(`text=${combination.from.language}`)
			).toBeVisible();
			await expect(
				page.locator(`text=${combination.from.framework}`)
			).toBeVisible();

			await page.click('button:has-text("Convert Project")');

			// Select target tech stack
			const languageSelect = page.locator("select").first();
			await languageSelect.selectOption(combination.to.language);

			const frameworkSelect = page.locator("select").nth(1);
			await frameworkSelect.selectOption(combination.to.framework);

			// Verify conversion plan shows correct transformation
			await page.click('button:has-text("Generate Conversion Plan")');
			await expect(
				page.locator(
					`text=${combination.from.framework} → ${combination.to.framework}`
				)
			).toBeVisible();

			// Reset for next iteration
			await page.goto("/");
		}
	});
});
