'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { CodeEditorProps, FileTreeNode, EditorFile } from './types';
import { FileTree } from '../../types';

const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  selectedFile,
  onFileSelect,
  onFileChange,
  readOnly = false
}) => {
  const [currentFile, setCurrentFile] = useState<string | null>(selectedFile || null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());

  // Convert FileTree to flat structure for easier handling
  const flatFiles = useMemo(() => {
    const flatten = (tree: FileTree, basePath = ''): EditorFile[] => {
      const files: EditorFile[] = [];
      
      if (tree.type === 'file' && tree.content !== undefined) {
        const fullPath = basePath ? `${basePath}/${tree.name}` : tree.name;
        files.push({
          path: fullPath,
          name: tree.name,
          content: tree.content,
          language: getLanguageFromPath(fullPath),
          modified: modifiedFiles.has(fullPath)
        });
      } else if (tree.children) {
        for (const child of tree.children) {
          const childPath = basePath ? `${basePath}/${tree.name}` : tree.name;
          files.push(...flatten(child, childPath));
        }
      }
      
      return files;
    };

    return flatten(files);
  }, [files, modifiedFiles]);

  // File tree structure for sidebar
  const fileTree = useMemo(() => {
    const buildTree = (tree: FileTree, basePath = ''): FileTreeNode => {
      const fullPath = basePath ? `${basePath}/${tree.name}` : tree.name;
      
      if (tree.type === 'file') {
        return {
          name: tree.name,
          path: fullPath,
          type: 'file',
          content: tree.content
        };
      } else {
        return {
          name: tree.name,
          path: fullPath,
          type: 'directory',
          children: tree.children?.map(child => buildTree(child, fullPath)) || []
        };
      }
    };

    return buildTree(files);
  }, [files]);

  // Initialize file contents
  useEffect(() => {
    const contents = new Map<string, string>();
    flatFiles.forEach(file => {
      contents.set(file.path, file.content);
    });
    setFileContents(contents);
  }, [flatFiles]);

  // Set initial file if none selected
  useEffect(() => {
    if (!currentFile && flatFiles.length > 0) {
      const firstFile = flatFiles.find(f => f.name.includes('index') || f.name.includes('main')) || flatFiles[0];
      setCurrentFile(firstFile.path);
      onFileSelect?.(firstFile.path);
    }
  }, [flatFiles, currentFile, onFileSelect]);

  const handleFileSelect = useCallback((filePath: string) => {
    setCurrentFile(filePath);
    onFileSelect?.(filePath);
  }, [onFileSelect]);

  const handleEditorChange = useCallback((value: string | undefined, filePath: string) => {
    if (value === undefined || readOnly) return;

    const newContents = new Map(fileContents);
    newContents.set(filePath, value);
    setFileContents(newContents);

    // Mark file as modified
    const originalContent = flatFiles.find(f => f.path === filePath)?.content || '';
    if (value !== originalContent) {
      setModifiedFiles(prev => new Set(prev).add(filePath));
    } else {
      setModifiedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(filePath);
        return newSet;
      });
    }

    onFileChange?.(filePath, value);
  }, [fileContents, flatFiles, readOnly, onFileChange]);

  const currentFileContent = currentFile ? fileContents.get(currentFile) || '' : '';
  const currentFileLanguage = currentFile ? getLanguageFromPath(currentFile) : 'javascript';

  return (
    <div className="flex h-full bg-gray-50">
      {/* File Explorer Sidebar */}
      <div className="w-64 bg-gray-100 border-r border-gray-300 overflow-y-auto">
        <div className="p-3 border-b border-gray-300">
          <h3 className="text-sm font-semibold text-gray-700">Files</h3>
        </div>
        <div className="p-2">
          <FileTreeRenderer
            node={fileTree}
            selectedFile={currentFile}
            onFileSelect={handleFileSelect}
            modifiedFiles={modifiedFiles}
          />
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {currentFile ? (
          <>
            {/* File Tab */}
            <div className="bg-white border-b border-gray-300 px-4 py-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {currentFile.split('/').pop()}
                </span>
                {modifiedFiles.has(currentFile) && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full" title="Modified" />
                )}
                {readOnly && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    Read Only
                  </span>
                )}
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1">
              <Editor
                height="100%"
                language={currentFileLanguage}
                value={currentFileContent}
                onChange={(value) => handleEditorChange(value, currentFile)}
                options={{
                  readOnly,
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  theme: 'vs-dark'
                }}
                theme="vs-dark"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Select a file from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// File Tree Renderer Component
interface FileTreeRendererProps {
  node: FileTreeNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  modifiedFiles: Set<string>;
  level?: number;
}

const FileTreeRenderer: React.FC<FileTreeRendererProps> = ({
  node,
  selectedFile,
  onFileSelect,
  modifiedFiles,
  level = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const handleToggle = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const isSelected = selectedFile === node.path;
  const isModified = modifiedFiles.has(node.path);

  return (
    <div>
      <div
        className={`
          flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-200 rounded
          ${isSelected ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.type === 'directory' && (
          <span className="mr-1 text-gray-500">
            {isExpanded ? '📂' : '📁'}
          </span>
        )}
        {node.type === 'file' && (
          <span className="mr-1 text-gray-500">
            {getFileIcon(node.name)}
          </span>
        )}
        <span className="flex-1 truncate">{node.name}</span>
        {isModified && (
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full ml-1" />
        )}
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeRenderer
              key={`${child.path}-${index}`}
              node={child}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              modifiedFiles={modifiedFiles}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Utility functions
function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'dockerfile': 'dockerfile',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin'
  };

  return languageMap[extension || ''] || 'plaintext';
}

function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const iconMap: Record<string, string> = {
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'py': '🐍',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'md': '📝',
    'yml': '⚙️',
    'yaml': '⚙️',
    'dockerfile': '🐳',
    'gitignore': '🚫',
    'env': '🔐'
  };

  return iconMap[extension || ''] || '📄';
}

export default CodeEditor;