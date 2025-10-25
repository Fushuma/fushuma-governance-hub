import { NewsFeed } from '@/components/news/NewsFeed';

export default function NewsV2Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">News & Updates</h1>
          <p className="text-lg text-gray-600">
            Latest announcements and updates from the Fushuma ecosystem
          </p>
        </div>

        {/* News Feed */}
        <NewsFeed />
      </div>
    </div>
  );
}

