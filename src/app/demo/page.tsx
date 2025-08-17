'use client';

import React from 'react';
import { TechStackSelectionContainer } from '@/components/selection';
import { TechStack, Project } from '@/types';

// Demo project data showcasing C# integration
const demoProject: Project = {
    id: 'demo-1',
    name: 'Legacy .NET Framework App',
    githubUrl: 'https://github.com/user/legacy-dotnet-app',
    userId: 'demo-user',
    originalTechStack: {
        language: 'csharp',
        framework: 'dotnet',
        database: 'sqlserver',
        runtime: 'dotnet-framework',
        buildTool: 'msbuild',
        packageManager: 'nuget',
        deployment: 'iis',
        additional: {
            version: '.NET Framework 4.8',
            webFramework: 'ASP.NET MVC'
        }
    },
    targetTechStack: undefined,
    status: 'ready',
    fileStructure: {
        name: 'legacy-dotnet-app',
        type: 'directory',
        path: '/',
        children: [
            {
                name: 'Controllers',
                type: 'directory',
                path: '/Controllers',
                children: [
                    {
                        name: 'HomeController.cs',
                        type: 'file',
                        path: '/Controllers/HomeController.cs',
                        content: 'using System.Web.Mvc;\n\nnamespace LegacyApp.Controllers\n{\n    public class HomeController : Controller\n    {\n        public ActionResult Index()\n        {\n            return View();\n        }\n    }\n}',
                        metadata: { size: 2048, lastModified: new Date() }
                    }
                ],
                metadata: { size: 0, lastModified: new Date() }
            },
            {
                name: 'Web.config',
                type: 'file',
                path: '/Web.config',
                content: '<?xml version="1.0" encoding="utf-8"?>\n<configuration>\n  <system.web>\n    <compilation targetFramework="4.8" />\n  </system.web>\n</configuration>',
                metadata: { size: 1024, lastModified: new Date() }
            }
        ],
        metadata: { size: 0, lastModified: new Date() }
    },
    createdAt: new Date(),
    updatedAt: new Date()
};

export default function DemoPage() {
    const handleContinue = (targetStack: TechStack) => {
        console.log('Selected target stack:', targetStack);
        alert(`Demo: Converting from C# (.NET Framework) to ${targetStack.language}${targetStack.framework ? ` + ${targetStack.framework}` : ''}!\n\nThis demonstrates the C# and .NET integration in the tech stack selector.`);
    };

    const handleBack = () => {
        window.history.back();
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                {/* Demo Header */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-blue-900 mb-2">
                            🚀 C# & .NET Integration Demo
                        </h1>
                        <p className="text-blue-800">
                            This demo showcases the tech stack selection interface with C# and .NET options.
                            The current project is a legacy .NET Framework application that you can convert to modern technologies.
                        </p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <h3 className="font-semibold text-blue-900">✨ New Features:</h3>
                                <ul className="list-disc list-inside text-blue-800 mt-1">
                                    <li>C# language support</li>
                                    <li>.NET framework options</li>
                                    <li>ASP.NET Core integration</li>
                                    <li>Intelligent complexity analysis</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-900">🎯 Try Converting To:</h3>
                                <ul className="list-disc list-inside text-blue-800 mt-1">
                                    <li>Modern .NET 8 + ASP.NET Core</li>
                                    <li>Node.js + TypeScript + React</li>
                                    <li>Python + Django</li>
                                    <li>Java + Spring Boot</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tech Stack Selection */}
                <TechStackSelectionContainer
                    project={demoProject}
                    onContinue={handleContinue}
                    onBack={handleBack}
                />
            </div>
        </div>
    );
}