import { ProjectImportContainer } from '@/components/import/ProjectImportContainer';

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Import Your Project
            </h1>
            <p className="text-lg text-gray-600">
              Import your GitHub repository and let AI convert it to your target tech stack
            </p>
          </div>
          
          <ProjectImportContainer />
        </div>
      </div>
    </div>
  );
}