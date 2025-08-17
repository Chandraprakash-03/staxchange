/**
 * In-app help system with tooltips, contextual help, and guided tours
 */

import React, { useState, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";

// Help content types
export interface HelpContent {
	id: string;
	title: string;
	content: string;
	type: "tooltip" | "modal" | "inline" | "tour";
	position?: "top" | "bottom" | "left" | "right";
	trigger?: "hover" | "click" | "focus";
	category?: string;
	keywords?: string[];
	relatedLinks?: Array<{
		title: string;
		url: string;
	}>;
}

// Help context
interface HelpContextType {
	showHelp: (contentId: string) => void;
	hideHelp: () => void;
	isHelpVisible: boolean;
	currentHelpId: string | null;
	startTour: (tourId: string) => void;
	searchHelp: (query: string) => HelpContent[];
}

const HelpContext = createContext<HelpContextType | null>(null);

// Help content database
const helpContent: Record<string, HelpContent> = {
	"import-repository": {
		id: "import-repository",
		title: "Import GitHub Repository",
		content: `
      <div class="help-content">
        <p>Import a GitHub repository to analyze and convert its tech stack.</p>
        <ul>
          <li><strong>Repository URL:</strong> Enter the full GitHub URL (e.g., https://github.com/user/repo)</li>
          <li><strong>Branch:</strong> Select the branch to import (default: main)</li>
          <li><strong>Include Tests:</strong> Import test files for conversion</li>
          <li><strong>Include Docs:</strong> Import documentation files</li>
        </ul>
        <div class="help-tip">
          💡 <strong>Tip:</strong> Make sure the repository is public or you have access permissions.
        </div>
      </div>
    `,
		type: "tooltip",
		position: "bottom",
		trigger: "hover",
		category: "import",
		keywords: ["import", "github", "repository", "clone"],
		relatedLinks: [
			{ title: "Supported Repository Types", url: "/docs/supported-repos" },
			{ title: "Import Troubleshooting", url: "/docs/import-issues" },
		],
	},

	"tech-stack-detection": {
		id: "tech-stack-detection",
		title: "Tech Stack Detection",
		content: `
      <div class="help-content">
        <p>Our AI automatically detects your project's technology stack by analyzing:</p>
        <ul>
          <li><strong>Package Files:</strong> package.json, requirements.txt, pom.xml</li>
          <li><strong>Configuration:</strong> Framework-specific config files</li>
          <li><strong>File Types:</strong> Source code extensions and patterns</li>
          <li><strong>Dependencies:</strong> Import statements and libraries</li>
        </ul>
        <div class="help-confidence">
          <h4>Confidence Levels:</h4>
          <div class="confidence-item">
            <span class="confidence-high">High (90-100%)</span> - Clear indicators found
          </div>
          <div class="confidence-item">
            <span class="confidence-medium">Medium (70-89%)</span> - Some ambiguity
          </div>
          <div class="confidence-item">
            <span class="confidence-low">Low (50-69%)</span> - Limited indicators
          </div>
        </div>
      </div>
    `,
		type: "modal",
		category: "analysis",
		keywords: ["detection", "analysis", "tech stack", "framework"],
		relatedLinks: [
			{ title: "Supported Technologies", url: "/docs/supported-tech" },
			{ title: "Manual Corrections", url: "/docs/manual-corrections" },
		],
	},

	"conversion-planning": {
		id: "conversion-planning",
		title: "Conversion Planning",
		content: `
      <div class="help-content">
        <p>The AI creates a detailed conversion plan before starting the actual conversion.</p>
        
        <h4>Plan Components:</h4>
        <ul>
          <li><strong>Compatibility Analysis:</strong> How well technologies align</li>
          <li><strong>Complexity Assessment:</strong> Estimated difficulty level</li>
          <li><strong>Time Estimation:</strong> Expected conversion duration</li>
          <li><strong>Risk Assessment:</strong> Potential issues and challenges</li>
          <li><strong>Manual Steps:</strong> Tasks requiring human intervention</li>
        </ul>

        <h4>Complexity Levels:</h4>
        <div class="complexity-levels">
          <div class="complexity-simple">
            <strong>Simple:</strong> Direct mapping, minimal changes needed
          </div>
          <div class="complexity-medium">
            <strong>Medium:</strong> Some architectural changes required
          </div>
          <div class="complexity-complex">
            <strong>Complex:</strong> Significant restructuring needed
          </div>
        </div>
      </div>
    `,
		type: "modal",
		category: "conversion",
		keywords: ["planning", "conversion", "complexity", "compatibility"],
		relatedLinks: [
			{
				title: "Conversion Best Practices",
				url: "/docs/conversion-best-practices",
			},
			{ title: "Understanding Complexity", url: "/docs/complexity-guide" },
		],
	},

	"live-preview": {
		id: "live-preview",
		title: "Live Preview Environment",
		content: `
      <div class="help-content">
        <p>The live preview runs your converted code in a sandboxed environment.</p>
        
        <h4>Features:</h4>
        <ul>
          <li><strong>Code Editor:</strong> Monaco editor with syntax highlighting</li>
          <li><strong>File Explorer:</strong> Navigate project structure</li>
          <li><strong>Terminal:</strong> Run build and test commands</li>
          <li><strong>Hot Reload:</strong> See changes instantly</li>
          <li><strong>Error Display:</strong> View compilation errors</li>
        </ul>

        <h4>Limitations:</h4>
        <ul>
          <li>30-minute session limit</li>
          <li>1GB RAM, 2 CPU cores</li>
          <li>Limited external API access</li>
          <li>10MB maximum file size</li>
        </ul>

        <div class="help-tip">
          💡 <strong>Tip:</strong> Changes are automatically saved for 24 hours.
        </div>
      </div>
    `,
		type: "modal",
		category: "preview",
		keywords: ["preview", "editor", "terminal", "sandbox"],
		relatedLinks: [
			{ title: "Preview Environments", url: "/docs/preview-environments" },
			{ title: "Keyboard Shortcuts", url: "/docs/editor-shortcuts" },
		],
	},

	"rate-limits": {
		id: "rate-limits",
		title: "Rate Limits and Usage",
		content: `
      <div class="help-content">
        <p>To ensure fair usage, we have the following rate limits:</p>
        
        <div class="rate-limits">
          <div class="rate-limit-item">
            <strong>AI Conversions:</strong> 3 per hour
          </div>
          <div class="rate-limit-item">
            <strong>GitHub Imports:</strong> 10 per 15 minutes
          </div>
          <div class="rate-limit-item">
            <strong>Preview Sessions:</strong> 50 per 5 minutes
          </div>
          <div class="rate-limit-item">
            <strong>API Requests:</strong> 100 per 15 minutes
          </div>
        </div>

        <p>If you hit a rate limit:</p>
        <ul>
          <li>Wait for the limit to reset automatically</li>
          <li>Consider upgrading to a premium plan</li>
          <li>Optimize your usage patterns</li>
        </ul>
      </div>
    `,
		type: "tooltip",
		position: "left",
		category: "limits",
		keywords: ["rate limit", "usage", "quota", "premium"],
		relatedLinks: [
			{ title: "Pricing Plans", url: "/pricing" },
			{ title: "Usage Optimization", url: "/docs/usage-tips" },
		],
	},
};

// Tooltip component
interface TooltipProps {
	content: HelpContent;
	targetElement: HTMLElement;
	onClose: () => void;
}

const Tooltip: React.FC<TooltipProps> = ({
	content,
	targetElement,
	onClose,
}) => {
	const [position, setPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		const updatePosition = () => {
			const rect = targetElement.getBoundingClientRect();
			const tooltipWidth = 320;
			const tooltipHeight = 200;

			let top = rect.top;
			let left = rect.left;

			switch (content.position) {
				case "top":
					top = rect.top - tooltipHeight - 10;
					left = rect.left + rect.width / 2 - tooltipWidth / 2;
					break;
				case "bottom":
					top = rect.bottom + 10;
					left = rect.left + rect.width / 2 - tooltipWidth / 2;
					break;
				case "left":
					top = rect.top + rect.height / 2 - tooltipHeight / 2;
					left = rect.left - tooltipWidth - 10;
					break;
				case "right":
					top = rect.top + rect.height / 2 - tooltipHeight / 2;
					left = rect.right + 10;
					break;
				default:
					top = rect.bottom + 10;
					left = rect.left;
			}

			// Keep tooltip within viewport
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (left < 10) left = 10;
			if (left + tooltipWidth > viewportWidth - 10)
				left = viewportWidth - tooltipWidth - 10;
			if (top < 10) top = 10;
			if (top + tooltipHeight > viewportHeight - 10)
				top = viewportHeight - tooltipHeight - 10;

			setPosition({ top, left });
		};

		updatePosition();
		window.addEventListener("scroll", updatePosition);
		window.addEventListener("resize", updatePosition);

		return () => {
			window.removeEventListener("scroll", updatePosition);
			window.removeEventListener("resize", updatePosition);
		};
	}, [targetElement, content.position]);

	return createPortal(
		<div
			className="help-tooltip"
			style={{
				position: "fixed",
				top: position.top,
				left: position.left,
				zIndex: 10000,
			}}
		>
			<div className="help-tooltip-content">
				<div className="help-tooltip-header">
					<h3>{content.title}</h3>
					<button onClick={onClose} className="help-tooltip-close">
						×
					</button>
				</div>
				<div
					className="help-tooltip-body"
					dangerouslySetInnerHTML={{ __html: content.content }}
				/>
				{content.relatedLinks && content.relatedLinks.length > 0 && (
					<div className="help-tooltip-links">
						<h4>Related:</h4>
						{content.relatedLinks.map((link, index) => (
							<a
								key={index}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
							>
								{link.title}
							</a>
						))}
					</div>
				)}
			</div>
		</div>,
		document.body
	);
};

// Help modal component
interface HelpModalProps {
	content: HelpContent;
	onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ content, onClose }) => {
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [onClose]);

	return createPortal(
		<div className="help-modal-overlay" onClick={onClose}>
			<div className="help-modal" onClick={(e) => e.stopPropagation()}>
				<div className="help-modal-header">
					<h2>{content.title}</h2>
					<button onClick={onClose} className="help-modal-close">
						×
					</button>
				</div>
				<div
					className="help-modal-body"
					dangerouslySetInnerHTML={{ __html: content.content }}
				/>
				{content.relatedLinks && content.relatedLinks.length > 0 && (
					<div className="help-modal-footer">
						<h3>Related Resources:</h3>
						<div className="help-modal-links">
							{content.relatedLinks.map((link, index) => (
								<a
									key={index}
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									{link.title}
								</a>
							))}
						</div>
					</div>
				)}
			</div>
		</div>,
		document.body
	);
};

// Help provider component
interface HelpProviderProps {
	children: React.ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
	const [currentHelpId, setCurrentHelpId] = useState<string | null>(null);
	const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

	const showHelp = (contentId: string, element?: HTMLElement) => {
		setCurrentHelpId(contentId);
		if (element) {
			setTargetElement(element);
		}
	};

	const hideHelp = () => {
		setCurrentHelpId(null);
		setTargetElement(null);
	};

	const startTour = (tourId: string) => {
		// Implementation for guided tours
		console.log("Starting tour:", tourId);
	};

	const searchHelp = (query: string): HelpContent[] => {
		const lowercaseQuery = query.toLowerCase();
		return Object.values(helpContent).filter(
			(content) =>
				content.title.toLowerCase().includes(lowercaseQuery) ||
				content.content.toLowerCase().includes(lowercaseQuery) ||
				content.keywords?.some((keyword) =>
					keyword.toLowerCase().includes(lowercaseQuery)
				)
		);
	};

	const currentContent = currentHelpId ? helpContent[currentHelpId] : null;

	return (
		<HelpContext.Provider
			value={{
				showHelp,
				hideHelp,
				isHelpVisible: !!currentHelpId,
				currentHelpId,
				startTour,
				searchHelp,
			}}
		>
			{children}
			{currentContent && currentContent.type === "tooltip" && targetElement && (
				<Tooltip
					content={currentContent}
					targetElement={targetElement}
					onClose={hideHelp}
				/>
			)}
			{currentContent && currentContent.type === "modal" && (
				<HelpModal content={currentContent} onClose={hideHelp} />
			)}
		</HelpContext.Provider>
	);
};

// Hook to use help context
export const useHelp = () => {
	const context = useContext(HelpContext);
	if (!context) {
		throw new Error("useHelp must be used within a HelpProvider");
	}
	return context;
};

// Help trigger component
interface HelpTriggerProps {
	helpId: string;
	children: React.ReactNode;
	trigger?: "hover" | "click" | "focus";
	className?: string;
}

export const HelpTrigger: React.FC<HelpTriggerProps> = ({
	helpId,
	children,
	trigger = "hover",
	className = "",
}) => {
	const { showHelp, hideHelp } = useHelp();
	const elementRef = React.useRef<HTMLDivElement>(null);

	const handleShow = () => {
		if (elementRef.current) {
			showHelp(helpId, elementRef.current);
		}
	};

	const handleHide = () => {
		hideHelp();
	};

	const props: any = {
		ref: elementRef,
		className: `help-trigger ${className}`,
	};

	if (trigger === "hover") {
		props.onMouseEnter = handleShow;
		props.onMouseLeave = handleHide;
	} else if (trigger === "click") {
		props.onClick = handleShow;
	} else if (trigger === "focus") {
		props.onFocus = handleShow;
		props.onBlur = handleHide;
	}

	return <div {...props}>{children}</div>;
};

// Help icon component
interface HelpIconProps {
	helpId: string;
	size?: "small" | "medium" | "large";
	className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
	helpId,
	size = "medium",
	className = "",
}) => {
	const { showHelp } = useHelp();
	const elementRef = React.useRef<HTMLButtonElement>(null);

	const handleClick = () => {
		if (elementRef.current) {
			showHelp(helpId, elementRef.current);
		}
	};

	return (
		<button
			ref={elementRef}
			onClick={handleClick}
			className={`help-icon help-icon-${size} ${className}`}
			title="Get help"
			aria-label="Get help"
		>
			?
		</button>
	);
};

// Help search component
interface HelpSearchProps {
	onResultSelect?: (content: HelpContent) => void;
	placeholder?: string;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
	onResultSelect,
	placeholder = "Search help...",
}) => {
	const { searchHelp, showHelp } = useHelp();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<HelpContent[]>([]);
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (query.length > 2) {
			const searchResults = searchHelp(query);
			setResults(searchResults);
			setIsOpen(true);
		} else {
			setResults([]);
			setIsOpen(false);
		}
	}, [query, searchHelp]);

	const handleResultClick = (content: HelpContent) => {
		showHelp(content.id);
		setIsOpen(false);
		setQuery("");
		onResultSelect?.(content);
	};

	return (
		<div className="help-search">
			<input
				type="text"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder={placeholder}
				className="help-search-input"
			/>
			{isOpen && results.length > 0 && (
				<div className="help-search-results">
					{results.map((result) => (
						<div
							key={result.id}
							className="help-search-result"
							onClick={() => handleResultClick(result)}
						>
							<div className="help-search-result-title">{result.title}</div>
							<div className="help-search-result-category">
								{result.category}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default HelpProvider;
