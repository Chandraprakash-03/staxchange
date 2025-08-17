import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Project Not Found</h2>
          <p className="text-gray-600">
            The project you're looking for doesn't exist or may have been deleted.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/import"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Import a New Project
          </Link>
          
          <div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}