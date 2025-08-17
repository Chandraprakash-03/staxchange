import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNavigation, useProjectNavigation } from "@/hooks/useNavigation";

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
const mockForward = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
		back: mockBack,
		forward: mockForward,
		refresh: mockRefresh,
	}),
	usePathname: () => "/test-path",
	useSearchParams: () => new URLSearchParams("?step=select&tab=overview"),
}));

// Mock store
vi.mock("@/store", () => ({
	useAppStore: () => ({
		setCurrentPage: vi.fn(),
		currentPage: "/test-path",
	}),
}));

describe("useNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should provide navigation functions", () => {
		const { result } = renderHook(() => useNavigation());

		expect(result.current.pathname).toBe("/test-path");
		expect(result.current.searchParams).toEqual({
			step: "select",
			tab: "overview",
		});
		expect(typeof result.current.navigateTo).toBe("function");
		expect(typeof result.current.navigateToProject).toBe("function");
		expect(typeof result.current.navigateToConversion).toBe("function");
		expect(typeof result.current.navigateToPreview).toBe("function");
		expect(typeof result.current.navigateToImport).toBe("function");
		expect(typeof result.current.navigateHome).toBe("function");
	});

	it("should navigate to different routes", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateTo("/test-route");
		});

		expect(mockPush).toHaveBeenCalledWith("/test-route", { scroll: true });
	});

	it("should navigate to project routes", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateToProject("project-123");
		});

		expect(mockPush).toHaveBeenCalledWith("/projects/project-123", {
			scroll: true,
		});
	});

	it("should navigate to conversion route", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateToConversion("project-123");
		});

		expect(mockPush).toHaveBeenCalledWith("/projects/project-123/convert", {
			scroll: true,
		});
	});

	it("should navigate to preview route", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateToPreview("project-123");
		});

		expect(mockPush).toHaveBeenCalledWith("/projects/project-123/preview", {
			scroll: true,
		});
	});

	it("should handle replace navigation", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateTo("/test-route", { replace: true });
		});

		expect(mockReplace).toHaveBeenCalledWith("/test-route", { scroll: true });
	});

	it("should handle browser navigation", () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.goBack();
		});
		expect(mockBack).toHaveBeenCalled();

		act(() => {
			result.current.goForward();
		});
		expect(mockForward).toHaveBeenCalled();

		act(() => {
			result.current.refresh();
		});
		expect(mockRefresh).toHaveBeenCalled();
	});

	it("should get search parameters", () => {
		const { result } = renderHook(() => useNavigation());

		expect(result.current.getSearchParam("step")).toBe("select");
		expect(result.current.getSearchParam("tab")).toBe("overview");
		expect(result.current.getSearchParam("nonexistent")).toBeNull();
	});
});

describe("useProjectNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should provide project-specific navigation", () => {
		const { result } = renderHook(() => useProjectNavigation("project-123"));

		expect(typeof result.current.navigateToStep).toBe("function");
		expect(typeof result.current.getCurrentStep).toBe("function");
	});

	it("should navigate to project steps", () => {
		const { result } = renderHook(() => useProjectNavigation("project-123"));

		act(() => {
			result.current.navigateToStep("convert");
		});

		expect(mockPush).toHaveBeenCalledWith("/projects/project-123/convert", {
			scroll: true,
		});
	});

	it("should determine current step from URL", () => {
		const { result } = renderHook(() => useProjectNavigation("project-123"));

		// Based on mocked search params, should return 'select'
		expect(result.current.getCurrentStep()).toBe("select");
	});
});
