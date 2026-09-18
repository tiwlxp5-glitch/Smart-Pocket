export default function DashboardLoading() {
  return (
    <div className="p-6 pb-24 min-h-screen bg-gray-50 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-5 w-32 bg-gray-200 rounded-md animate-pulse mb-2"></div>
          <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
      </div>

      {/* Main Card Skeleton */}
      <div className="w-full h-40 bg-white rounded-3xl shadow-sm border border-gray-100 animate-pulse mb-8 p-6 flex flex-col justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded-md"></div>
        <div className="h-10 w-40 bg-gray-200 rounded-md"></div>
        <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="h-28 bg-white rounded-3xl shadow-sm border border-gray-100 animate-pulse"></div>
        <div className="h-28 bg-white rounded-3xl shadow-sm border border-gray-100 animate-pulse"></div>
      </div>

      {/* List Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded-md"></div>
            <div className="h-3 w-2/3 bg-gray-200 rounded-md"></div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded-md"></div>
            <div className="h-3 w-1/2 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
