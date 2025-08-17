/**
 * Monitoring Dashboard Page
 * Displays the system monitoring dashboard
 */

import MonitoringDashboard from "@/components/monitoring/MonitoringDashboard";

export default function MonitoringPage() {
	return <MonitoringDashboard />;
}

export const metadata = {
	title: "System Monitoring - AI Tech Stack Converter",
	description: "Real-time system health and performance monitoring dashboard",
};
