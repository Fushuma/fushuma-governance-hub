import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { NewsCard } from './NewsCard';
import { Search, Filter, TrendingUp } from 'lucide-react';

export function NewsFeed() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const { data: newsData, isLoading } = trpc.newsV2.list.useQuery({
    limit: 20,
    category: selectedCategory,
    pinnedOnly: showPinnedOnly,
  });

  const { data: categories } = trpc.newsV2.getCategories.useQuery();
  const { data: trending } = trpc.newsV2.getTrending.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest News</h2>
          <p className="text-gray-600">
            Stay updated with the latest announcements and updates from Fushuma
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories?.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Pinned Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showPinnedOnly
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Pinned Only</span>
            </button>
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {newsData?.items.map(news => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>

        {/* Load More */}
        {newsData?.hasMore && (
          <div className="text-center">
            <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trending News */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Trending</h3>
          </div>
          <div className="space-y-4">
            {trending?.map((news, index) => (
              <div key={news.id} className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/news/${news.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                  >
                    {news.title}
                  </a>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                    <span>{news.viewCount} views</span>
                    <span>•</span>
                    <span>{new Date(news.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Telegram Sync Status */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Telegram Integration</h3>
          <p className="text-sm text-gray-600 mb-4">
            News is automatically synced from our official Telegram channel
          </p>
          <a
            href="https://t.me/FushumaChain"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
            </svg>
            <span>Join Channel</span>
          </a>
        </div>
      </div>
    </div>
  );
}

