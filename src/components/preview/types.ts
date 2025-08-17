import { FileTree, FileChange, PreviewEnvironment } from '../../types';

export interface LivePreviewProps {
  projectId: string;
  files: FileTree;
  previewEnvironment?: PreviewEnvironment;
  onFileChange?: (changes: FileChange[]) => void;
  onPreviewUpdate?: (url: string) => void;
}

export interface CodeEditorProps {
  files: FileTree;
  selectedFile?: string;
  onFileSelect?: (filePath: string) => void;
  onFileChange?: (filePath: string, content: string) => void;
  readOnly?: boolean;
}

export interface PreviewFrameProps {
  url?: string;
  loading?: boolean;
  error?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export interface SplitPaneLayoutProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultSplit?: number;
  minSize?: number;
  maxSize?: number;
  split?: 'vertical' | 'horizontal';
  onSplitChange?: (size: number) => void;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  content?: string;
}

export interface EditorFile {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}