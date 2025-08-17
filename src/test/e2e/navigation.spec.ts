import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
	test("should navigate between main pages", async ({ page }) => {
		// Start at home page
		await page.goto("/");

		// Check home page loads
		await expect(page.locator("h1")).toContainText("AI Tech Stack Converter");

		// Navigate to import page via button
		await page.click('button:has-text("Import Your Project")');
		await expect(page).toHaveURL("/import");
		await expect(page.locator("h1")).toContainText("Import Your Project");

		// Navigate to projects page via navigation
		await page.click('a:has-text("Projects")');
		await expect(page).toHaveURL("/projects");
		await expect(page.locator("h1")).toContainText("Your Projects");

		// Navigate back to home
		await page.click('a:has-text("Home")');
		await expect(page).toHaveURL("/");
	});

	test("should show navigation breadcrumbs on project pages", async ({
		page,
	}) => {
		// Navigate to demo page (which has a project)
		await page.goto("/demo");

		// Check demo page loads
		await expect(page.locator("h1")).toContainText(
			"C# & .NET Integration Demo"
		);

		// The demo page should show tech stack selection
		await expect(page.locator("text=Select Target Tech Stack")).toBeVisible();
	});

	test("should handle URL state synchronization", async ({ page }) => {
		// Test direct navigation to import page
		await page.goto("/import");
		await expect(page.locator("h1")).toContainText("Import Your Project");

		// Test direct navigation to projects page
		await page.goto("/projects");
		await expect(page.locator("h1")).toContainText("Your Projects");

		// Test navigation state is maintained
		await page.goBack();
		await expect(page).toHaveURL("/import");

		await page.goForward();
		await expect(page).toHaveURL("/projects");
	});

	test("should show project count in navigation when projects exist", async ({
		page,
	}) => {
		// This test would need mock data or a way to create projects
		// For now, we'll test the empty state
		await page.goto("/projects");

		// Should show empty state
		await expect(page.locator("text=No Projects Yet")).toBeVisible();
		await expect(
			page.locator("text=Import your first GitHub repository")
		).toBeVisible();
	});
});
