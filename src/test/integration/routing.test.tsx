import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/Navigation";
import { useAppStore } from "@/store";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	usePathname: vi.fn(),
	Link: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock store
vi.mock("@/store", () => ({
	useAppStore: vi.fn(),
}));

// Mock navigation hook
vi.mock("@/hooks/useNavigation", () => ({
	useNavigation: () => ({
		navigateHome: vi.fn(),
		navigateToImport: vi.fn(),
	}),
}));

describe("Routing Integration", () => {
	const mockUseRouter = useRouter as any;
	const mockUseAppStore = useAppStore as any;

	beforeEach(() => {
		mockUseRouter.mockReturnValue({
			push: vi.fn(),
			replace: vi.fn(),
			back: vi.fn(),
			forward: vi.fn(),
			refresh: vi.fn(),
		});

		mockUseAppStore.mockReturnValue({
			user: null,
			isAuthenticated: false,
			projects: [],
			navigateHome: vi.fn(),
			navigateToImport: vi.fn(),
		});

		// Mock usePathname
		require("next/navigation").usePathname.mockReturnValue("/");
	});

	it("should render navigation with correct links", () => {
		render(<Navigation />);

		expect(screen.getByText("AI Tech Stack Converter")).toBeInTheDocument();
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("Projects")).toBeInTheDocument();
		expect(screen.getByText("Import")).toBeInTheDocument();
	});

	it("should show active state for current page", () => {
		// Mock current page as projects
		require("next/navigation").usePathname.mockReturnValue("/projects");

		render(<Navigation />);

		const projectsLink = screen.getByText("Projects");
		expect(projectsLink).toHaveClass("text-blue-600");
	});

	it("should show project count when projects exist", () => {
		mockUseAppStore.mockReturnValue({
			user: null,
			isAuthenticated: false,
			projects: [
				{ id: "1", name: "Project 1" },
				{ id: "2", name: "Project 2" },
			],
		});

		render(<Navigation />);

		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("should show breadcrumbs for project pages", () => {
		require("next/navigation").usePathname.mockReturnValue(
			"/projects/123/convert"
		);

		render(<Navigation />);

		expect(screen.getByText("Projects")).toBeInTheDocument();
		expect(screen.getByText("Convert")).toBeInTheDocument();
	});
});
