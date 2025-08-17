"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store";

interface AppProviderProps {
	children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
	const { setError } = useAppStore();

	useEffect(() => {
		// Global error handler
		const handleError = (event: ErrorEvent) => {
			console.error("Global error:", event.error);
			setError("An unexpected error occurred");
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			console.error("Unhandled promise rejection:", event.reason);
			setError("An unexpected error occurred");
		};

		window.addEventListener("error", handleError);
		window.addEventListener("unhandledrejection", handleUnhandledRejection);

		return () => {
			window.removeEventListener("error", handleError);
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection
			);
		};
	}, [setError]);

	return <>{children}</>;
}
