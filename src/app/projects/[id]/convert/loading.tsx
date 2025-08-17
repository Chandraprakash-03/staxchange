export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Project Info Skeleton */}
            <div className="mb-8">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech Stack Skeleton */}
            <div className="mb-8">
              <div className="h-6 bg-gray-200 rounded w-56 mb-4 animate-pulse"></div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversion Options Skeleton */}
            <div className="text-center">
              <div className="h-6 bg-gray-200 rounded w-72 mx-auto mb-4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-6 animate-pulse"></div>
              
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="flex gap-4">
                  <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}