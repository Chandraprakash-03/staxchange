'use client';

import React, { useState } from 'react';
import { LivePreviewInterface } from '../../../components/preview';
import { FileTree, FileChange, PreviewEnvironment } from '../../../types';

const PreviewDemoPage: React.FC = () => {
    const [previewEnvironment, setPreviewEnvironment] = useState<PreviewEnvironment>({
        id: 'demo-preview',
        projectId: 'demo-project',
        url: 'https://stackblitz.com/edit/react-ts-hello-world?embed=1&file=src/App.tsx',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {
            runtime: 'node',
            port: 3000,
            entryPoint: 'src/index.tsx',
            environment: {}
        }
    });

    // Sample React project files
    const sampleFiles: FileTree = {
        name: 'react-demo',
        type: 'directory',
        path: '',
        children: [
            {
                name: 'src',
                type: 'directory',
                path: 'src',
                children: [
                    {
                        name: 'App.tsx',
                        type: 'file',
                        path: 'src/App.tsx',
                        content: `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>React Demo App</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <div className="counter">
          <button onClick={() => setCount(count - 1)}>-</button>
          <span>Count: {count}</span>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      </header>
    </div>
  );
}

export default App;`,
                        metadata: { size: 500, lastModified: new Date() }
                    },
                    {
                        name: 'App.css',
                        type: 'file',
                        path: 'src/App.css',
                        content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}

.counter {
  margin: 20px 0;
}

.counter button {
  background-color: #61dafb;
  border: none;
  color: #282c34;
  padding: 10px 20px;
  margin: 0 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.counter button:hover {
  background-color: #21a9c7;
}

.counter span {
  margin: 0 20px;
  font-size: 18px;
}`,
                        metadata: { size: 600, lastModified: new Date() }
                    },
                    {
                        name: 'index.tsx',
                        type: 'file',
                        path: 'src/index.tsx',
                        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
                        metadata: { size: 250, lastModified: new Date() }
                    },
                    {
                        name: 'index.css',
                        type: 'file',
                        path: 'src/index.css',
                        content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
                        metadata: { size: 300, lastModified: new Date() }
                    }
                ],
                metadata: { size: 0, lastModified: new Date() }
            },
            {
                name: 'public',
                type: 'directory',
                path: 'public',
                children: [
                    {
                        name: 'index.html',
                        type: 'file',
                        path: 'public/index.html',
                        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="React Demo App" />
    <title>React Demo App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
                        metadata: { size: 400, lastModified: new Date() }
                    }
                ],
                metadata: { size: 0, lastModified: new Date() }
            },
            {
                name: 'package.json',
                type: 'file',
                path: 'package.json',
                content: JSON.stringify({
                    name: 'react-demo',
                    version: '0.1.0',
                    private: true,
                    dependencies: {
                        '@types/node': '^16.7.13',
                        '@types/react': '^18.0.0',
                        '@types/react-dom': '^18.0.0',
                        'react': '^18.2.0',
                        'react-dom': '^18.2.0',
                        'react-scripts': '5.0.1',
                        'typescript': '^4.4.2',
                        'web-vitals': '^2.1.0'
                    },
                    scripts: {
                        start: 'react-scripts start',
                        build: 'react-scripts build',
                        test: 'react-scripts test',
                        eject: 'react-scripts eject'
                    },
                    eslintConfig: {
                        extends: [
                            'react-app',
                            'react-app/jest'
                        ]
                    },
                    browserslist: {
                        production: [
                            '>0.2%',
                            'not dead',
                            'not op_mini all'
                        ],
                        development: [
                            'last 1 chrome version',
                            'last 1 firefox version',
                            'last 1 safari version'
                        ]
                    }
                }, null, 2),
                metadata: { size: 800, lastModified: new Date() }
            },
            {
                name: 'README.md',
                type: 'file',
                path: 'README.md',
                content: `# React Demo App

This is a demo React application showcasing the live preview interface.

## Features

- Real-time code editing with Monaco Editor
- Live preview with hot reload
- Split-pane layout for code and preview
- File tree navigation
- Syntax highlighting for multiple languages

## Getting Started

1. Edit the files in the code editor
2. See changes reflected in the live preview
3. Use the layout controls to adjust the view

## Technologies Used

- React 18
- TypeScript
- Monaco Editor
- WebContainers API
- Tailwind CSS`,
                metadata: { size: 500, lastModified: new Date() }
            }
        ],
        metadata: { size: 0, lastModified: new Date() }
    };

    const handleFileChange = (changes: FileChange[]) => {
        console.log('File changes:', changes);
        // In a real implementation, this would update the preview
    };

    const handlePreviewUpdate = (url: string) => {
        console.log('Preview URL updated:', url);
    };

    const togglePreviewStatus = () => {
        setPreviewEnvironment(prev => ({
            ...prev,
            status: prev.status === 'ready' ? 'error' : 'ready'
        }));
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Demo Header */}
            <div className="bg-blue-600 text-white px-6 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Live Preview Interface Demo</h1>
                        <p className="text-blue-100 text-sm">
                            Experience real-time code editing with live preview
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={togglePreviewStatus}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded text-sm transition-colors"
                        >
                            Toggle Preview Status
                        </button>
                        <a
                            href="/projects"
                            className="px-4 py-2 bg-white text-blue-600 hover:bg-gray-100 rounded text-sm transition-colors"
                        >
                            Back to Projects
                        </a>
                    </div>
                </div>
            </div>

            {/* Live Preview Interface */}
            <div className="flex-1">
                <LivePreviewInterface
                    projectId="demo-project"
                    files={sampleFiles}
                    previewEnvironment={previewEnvironment}
                    onFileChange={handleFileChange}
                    onPreviewUpdate={handlePreviewUpdate}
                />
            </div>
        </div>
    );
};

export default PreviewDemoPage;