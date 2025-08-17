"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store";

export interface NavigationOptions {
	replace?: boolean;
	scroll?: boolean;
	shallow?: boolean;
}

export function useNavigation() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { setCurrentPage, currentPage } = useAppStore();

	// Sync current page with pathname
	useEffect(() => {
		if (pathname !== currentPage) {
			setCurrentPage(pathname);
		}
	}, [pathname, currentPage, setCurrentPage]);

	// Navigation functions
	const navigateTo = useCallback(
		(path: string, options: NavigationOptions = {}) => {
			const { replace = false, scroll = true } = options;

			if (replace) {
				router.replace(path, { scroll });
			} else {
				router.push(path, { scroll });
			}
		},
		[router]
	);

	const navigateToProject = useCallback(
		(projectId: string) => {
			navigateTo(`/projects/${projectId}`);
		},
		[navigateTo]
	);

	const navigateToConversion = useCallback(
		(projectId: string) => {
			navigateTo(`/projects/${projectId}/convert`);
		},
		[navigateTo]
	);

	const navigateToPreview = useCallback(
		(projectId: string) => {
			navigateTo(`/projects/${projectId}/preview`);
		},
		[navigateTo]
	);

	const navigateToImport = useCallback(() => {
		navigateTo("/import");
	}, [navigateTo]);

	const navigateHome = useCallback(() => {
		navigateTo("/");
	}, [navigateTo]);

	const goBack = useCallback(() => {
		router.back();
	}, [router]);

	const goForward = useCallback(() => {
		router.forward();
	}, [router]);

	const refresh = useCallback(() => {
		router.refresh();
	}, [router]);

	// URL state management
	const updateSearchParams = useCallback(
		(
			params: Record<string, string | null>,
			options: NavigationOptions = {}
		) => {
			const newSearchParams = new URLSearchParams(searchParams.toString());

			Object.entries(params).forEach(([key, value]) => {
				if (value === null) {
					newSearchParams.delete(key);
				} else {
					newSearchParams.set(key, value);
				}
			});

			const newUrl = `${pathname}?${newSearchParams.toString()}`;

			if (options.replace) {
				router.replace(newUrl, { scroll: options.scroll });
			} else {
				router.push(newUrl, { scroll: options.scroll });
			}
		},
		[pathname, searchParams, router]
	);

	const getSearchParam = useCallback(
		(key: string): string | null => {
			return searchParams.get(key);
		},
		[searchParams]
	);

	const getAllSearchParams = useCallback((): Record<string, string> => {
		const params: Record<string, string> = {};
		searchParams.forEach((value, key) => {
			params[key] = value;
		});
		return params;
	}, [searchParams]);

	return {
		// Current state
		pathname,
		searchParams: getAllSearchParams(),

		// Navigation functions
		navigateTo,
		navigateToProject,
		navigateToConversion,
		navigateToPreview,
		navigateToImport,
		navigateHome,
		goBack,
		goForward,
		refresh,

		// URL state management
		updateSearchParams,
		getSearchParam,
		getAllSearchParams,
	};
}

// Hook for managing project-specific navigation state
export function useProjectNavigation(projectId?: string) {
	const navigation = useNavigation();
	const { currentProject, setCurrentProject } = useAppStore();

	const navigateToStep = useCallback(
		(step: "import" | "select" | "convert" | "preview") => {
			if (!projectId) return;

			const stepPaths = {
				import: `/projects/${projectId}`,
				select: `/projects/${projectId}?step=select`,
				convert: `/projects/${projectId}/convert`,
				preview: `/projects/${projectId}/preview`,
			};

			navigation.navigateTo(stepPaths[step]);
		},
		[projectId, navigation]
	);

	const getCurrentStep = useCallback((): string => {
		const step = navigation.getSearchParam("step");
		if (step) return step;

		if (navigation.pathname.includes("/convert")) return "convert";
		if (navigation.pathname.includes("/preview")) return "preview";
		if (navigation.pathname.includes("/projects/")) return "import";

		return "import";
	}, [navigation]);

	return {
		...navigation,
		navigateToStep,
		getCurrentStep,
		currentStep: getCurrentStep(),
	};
}
