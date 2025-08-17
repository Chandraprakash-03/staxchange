import { test, expect } from "@playwright/test";

test.describe("Complete User Workflow", () => {
	test("should complete full project conversion workflow", async ({ page }) => {
		// Start at home page
		await page.goto("/");

		// Navigate to import
		await page.click('button:has-text("Import Your Project")');
		await expect(page).toHaveURL("/import");

		// Test import form (this would need actual GitHub integration in real scenario)
		await expect(page.locator('input[placeholder*="GitHub"]')).toBeVisible();

		// Navigate to demo to test the full workflow
		await page.goto("/demo");

		// Should see tech stack selection interface
		await expect(page.locator("text=Select Target Tech Stack")).toBeVisible();

		// Test tech stack selection
		const languageSelect = page.locator("select").first();
		await languageSelect.selectOption("typescript");

		// Should see framework options update
		await expect(page.locator("select").nth(1)).toBeVisible();

		// Select a framework
		const frameworkSelect = page.locator("select").nth(1);
		await frameworkSelect.selectOption("react");

		// Should see continue button become enabled
		const continueButton = page.locator('button:has-text("Continue")');
		await expect(continueButton).toBeEnabled();

		// Click continue to simulate conversion
		await continueButton.click();

		// Should show conversion demo alert (since this is demo mode)
		// In real implementation, this would navigate to conversion page
	});

	test("should handle project navigation flow", async ({ page }) => {
		// Test projects page empty state
		await page.goto("/projects");

		await expect(page.locator("text=No Projects Yet")).toBeVisible();

		// Click import button from empty state
		await page.click('button:has-text("Import Your First Project")');
		await expect(page).toHaveURL("/import");

		// Navigate back to projects
		await page.click('a:has-text("Projects")');
		await expect(page).toHaveURL("/projects");
	});

	test("should maintain state across navigation", async ({ page }) => {
		// Start at home
		await page.goto("/");

		// Navigate through multiple pages
		await page.click('button:has-text("Import Your Project")');
		await expect(page).toHaveURL("/import");

		await page.click('a:has-text("Projects")');
		await expect(page).toHaveURL("/projects");

		await page.click('a:has-text("Home")');
		await expect(page).toHaveURL("/");

		// Test browser back/forward
		await page.goBack();
		await expect(page).toHaveURL("/projects");

		await page.goBack();
		await expect(page).toHaveURL("/import");

		await page.goForward();
		await expect(page).toHaveURL("/projects");
	});

	test("should handle responsive navigation", async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");

		// Mobile menu button should be visible
		await expect(page.locator("button:has(svg)")).toBeVisible();

		// Desktop navigation should be hidden
		await expect(page.locator("div.hidden.md\\:flex")).toBeHidden();

		// Test desktop viewport
		await page.setViewportSize({ width: 1024, height: 768 });

		// Desktop navigation should be visible
		await expect(page.locator("div.hidden.md\\:flex")).toBeVisible();
	});

	test("should show loading states appropriately", async ({ page }) => {
		await page.goto("/projects");

		// Should not show loading spinner on projects page when no projects
		await expect(page.locator("text=Loading projects...")).not.toBeVisible();

		// Should show empty state instead
		await expect(page.locator("text=No Projects Yet")).toBeVisible();
	});
});
