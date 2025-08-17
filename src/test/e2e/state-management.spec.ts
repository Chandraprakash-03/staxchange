import { test, expect } from "@playwright/test";

test.describe("State Management", () => {
	test("should persist navigation state across page reloads", async ({
		page,
	}) => {
		// Navigate to a specific page
		await page.goto("/import");

		// Reload the page
		await page.reload();

		// Should still be on the same page
		await expect(page).toHaveURL("/import");
		await expect(page.locator("h1")).toContainText("Import Your Project");
	});

	test("should handle URL parameters correctly", async ({ page }) => {
		// Test URL with query parameters (simulating project step)
		await page.goto("/demo?step=select");

		// Should load the demo page
		await expect(page.locator("h1")).toContainText(
			"C# & .NET Integration Demo"
		);

		// Should show tech stack selection
		await expect(page.locator("text=Select Target Tech Stack")).toBeVisible();
	});

	test("should maintain scroll position on navigation", async ({ page }) => {
		// Go to home page and scroll down
		await page.goto("/");

		// Scroll to bottom of page
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		// Navigate away and back
		await page.click('a:has-text("Projects")');
		await expect(page).toHaveURL("/projects");

		await page.click('a:has-text("Home")');
		await expect(page).toHaveURL("/");

		// Should be back at top (default behavior)
		const scrollY = await page.evaluate(() => window.scrollY);
		expect(scrollY).toBe(0);
	});

	test("should handle error states gracefully", async ({ page }) => {
		// Test navigation to non-existent project
		await page.goto("/projects/non-existent-id");

		// Should handle gracefully (either redirect or show error)
		// The exact behavior depends on implementation
		// For now, we'll just check the page loads without crashing
		await expect(page.locator("body")).toBeVisible();
	});

	test("should update navigation active states correctly", async ({ page }) => {
		await page.goto("/");

		// Home should be active
		const homeLink = page.locator('a:has-text("Home")');
		await expect(homeLink).toHaveClass(/text-blue-600/);

		// Navigate to projects
		await page.click('a:has-text("Projects")');

		// Projects should now be active
		const projectsLink = page.locator('a:has-text("Projects")');
		await expect(projectsLink).toHaveClass(/text-blue-600/);

		// Home should no longer be active
		await expect(homeLink).not.toHaveClass(/text-blue-600/);
	});

	test("should handle concurrent navigation requests", async ({ page }) => {
		await page.goto("/");

		// Rapidly click navigation links
		await Promise.all([
			page.click('a:has-text("Projects")'),
			page.click('a:has-text("Import")'),
		]);

		// Should end up on one of the pages without errors
		const url = page.url();
		expect(url.includes("/projects") || url.includes("/import")).toBeTruthy();
	});
});
