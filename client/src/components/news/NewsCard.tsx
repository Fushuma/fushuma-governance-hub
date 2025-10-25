import { Eye, Calendar, Tag, Pin } from 'lucide-react';
import { Link } from 'wouter';

interface News {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: Date;
  source: 'telegram' | 'manual' | 'github' | 'official';
  category: string;
  tags: string[];
  isPinned: boolean;
  viewCount: number;
}

interface NewsCardProps {
  news: News;
}

export function NewsCard({ news }: NewsCardProps) {
  const sourceColors = {
    telegram: 'bg-blue-100 text-blue-800',
    manual: 'bg-gray-100 text-gray-800',
    github: 'bg-purple-100 text-purple-800',
    official: 'bg-green-100 text-green-800',
  };

  const sourceLabels = {
    telegram: 'Telegram',
    manual: 'Manual',
    github: 'GitHub',
    official: 'Official',
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const newsDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - newsDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      if (diffInHours < 1) return 'Just now';
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return newsDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: newsDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <Link
      to={`/news/${news.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 border-2 border-transparent hover:border-blue-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {news.isPinned && (
              <Pin className="w-4 h-4 text-yellow-600 fill-yellow-600" />
            )}
            <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
              {news.title}
            </h3>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${sourceColors[news.source]}`}>
          {sourceLabels[news.source]}
        </span>
      </div>

      {/* Excerpt */}
      <p className="text-gray-600 line-clamp-3 mb-4">{news.excerpt}</p>

      {/* Tags */}
      {news.tags && news.tags.length > 0 && (
        <div className="flex items-center flex-wrap gap-2 mb-4">
          {news.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              <Tag className="w-3 h-3" />
              <span>{tag}</span>
            </span>
          ))}
          {news.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{news.tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(news.publishedAt)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{news.viewCount} views</span>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          By <span className="font-medium text-gray-900">{news.author}</span>
        </div>
      </div>
    </Link>
  );
}

