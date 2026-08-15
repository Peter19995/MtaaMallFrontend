import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  BookmarkIcon,
  ShareIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ArrowPathIcon,
  SparklesIcon,
  NewspaperIcon,
  FireIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { Button, Select, TextInput } from '@components/common'
import {
  listPublicBlogCategoriesRequest,
  listPublicBlogsRequest,
  type BlogSummaryResponse
} from '@api/modules/blogs.api'
import { resolveMediaUrl } from '@utils/media'
import { AppTheme } from '@constants/theme'

const formatDate = (value?: string | null): string => {
  if (!value) return 'Draft'
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value))
}

const formatRelativeTime = (dateString?: string | null): string => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

const getBlogImage = (blog: BlogSummaryResponse): string | undefined =>
  resolveMediaUrl((blog.image_urls ?? [])[0])

const getReadingTime = (content?: string): number => {
  if (!content) return 3
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const featuredPosts = [
  {
    id: 'featured-1',
    title: '10 Interior Design Trends for 2024',
    excerpt: 'Discover the latest trends in interior design that are shaping modern spaces.',
    image: 'https://images.unsplash.com/photo-1615529162924-f86053884682?auto=format&fit=crop&w=1200&q=80',
    category: 'Design Trends',
    date: '2024-03-15',
    readTime: 5
  },
  {
    id: 'featured-2',
    title: 'How to Choose the Perfect Curtains',
    excerpt: 'A comprehensive guide to selecting curtains that complement your space.',
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=80',
    category: 'Product Guide',
    date: '2024-03-10',
    readTime: 4
  },
  {
    id: 'featured-3',
    title: 'Sustainable Materials in Modern Design',
    excerpt: 'Exploring eco-friendly options for contemporary interior design.',
    image: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1200&q=80',
    category: 'Sustainability',
    date: '2024-03-05',
    readTime: 6
  }
]

const BlogPage = () => {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<'all' | number>('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState<BlogSummaryResponse | null>(null)
  const [bookmarked, setBookmarked] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest')

  const categoriesQuery = useQuery({
    queryKey: ['blogs', 'public', 'categories'],
    queryFn: listPublicBlogCategoriesRequest
  })

  const blogsQuery = useQuery({
    queryKey: ['blogs', 'public', 'list', search, categoryId, featuredOnly, sortBy],
    queryFn: () =>
      listPublicBlogsRequest({
        limit: 50,
        search: search.trim() || undefined,
        category_id: categoryId === 'all' ? undefined : categoryId,
        is_featured: featuredOnly || undefined
      })
  })

  const blogs = useMemo(() => blogsQuery.data ?? [], [blogsQuery.data])

  // Sort blogs based on selected option
  const sortedBlogs = useMemo(() => {
    const sorted = [...blogs]
    
    switch (sortBy) {
      case 'popular':
        return sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      case 'trending':
        return sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      case 'latest':
      default:
        return sorted.sort((a, b) => {
          const dateA = new Date(a.publish_date || a.created_at || 0).getTime()
          const dateB = new Date(b.publish_date || b.created_at || 0).getTime()
          return dateB - dateA
        })
    }
  }, [blogs, sortBy])

  const toggleBookmark = (blogId: number) => {
    setBookmarked(prev => 
      prev.includes(blogId) 
        ? prev.filter(id => id !== blogId)
        : [...prev, blogId]
    )
  }

  // Blog detail modal
  const BlogDetailModal = () => {
    if (!selectedBlog) return null

    const imageUrl = getBlogImage(selectedBlog)
    const readingTime = getReadingTime(selectedBlog.content)

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={() => setSelectedBlog(null)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Image */}
          {imageUrl && (
            <div className="relative h-64 bg-gradient-to-br from-primary/10 to-secondary/10">
              <img 
                src={imageUrl} 
                alt={selectedBlog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                  <span className="bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    {selectedBlog.category_name || 'General'}
                  </span>
                  <span className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {readingTime} min read
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedBlog.title}</h2>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Meta Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4 text-sm text-text-tertiary">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDate(selectedBlog.publish_date || selectedBlog.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  {selectedBlog.author_name || 'MtaaMall'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-background rounded-full transition-colors">
                  <ShareIcon className="w-4 h-4 text-text-secondary" />
                </button>
                <button 
                  onClick={() => toggleBookmark(selectedBlog.id)}
                  className="p-2 hover:bg-background rounded-full transition-colors"
                >
                  {bookmarked.includes(selectedBlog.id) ? (
                    <BookmarkIcon className="w-4 h-4 text-primary fill-primary" />
                  ) : (
                    <BookmarkIcon className="w-4 h-4 text-text-secondary" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedBlog(null)}
                  className="p-2 hover:bg-background rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <p className="text-text-secondary leading-relaxed">
                {selectedBlog.content || selectedBlog.excerpt || 'Full article content goes here...'}
              </p>
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border">
              <button className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors">
                <HeartIcon className="w-5 h-5" />
                <span>{selectedBlog.like_count || 0}</span>
              </button>
              <button className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors">
                <ChatBubbleLeftIcon className="w-5 h-5" />
                <span>{selectedBlog.comment_count || 0}</span>
              </button>
              <button className="flex items-center gap-1 text-text-secondary hover:text-primary transition-colors">
                <BookmarkIcon className="w-5 h-5" />
                <span>{selectedBlog.bookmark_count || 0}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <NewspaperIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Our Blog
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-4">
              Insights & Inspiration for{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Beautiful Spaces
              </span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Discover design trends, project stories, and expert tips from our team of interior specialists.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts Carousel */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-2">
          <FireIcon className="w-6 h-6 text-primary" />
          Featured Posts
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {featuredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-lg hover:shadow-2xl transition-all cursor-pointer"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
                    {post.category}
                  </span>
                  <h3 className="text-lg font-bold text-white">{post.title}</h3>
                  <div className="flex items-center gap-2 text-white/80 text-xs mt-2">
                    <span>{formatDate(post.date)}</span>
                    <span>•</span>
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Total Articles</p>
            <p className="text-2xl font-bold text-primary">{blogs.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Categories</p>
            <p className="text-2xl font-bold text-secondary">{(categoriesQuery.data ?? []).length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Featured</p>
            <p className="text-2xl font-bold text-accent">{blogs.filter(b => b.is_featured).length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Total Reads</p>
            <p className="text-2xl font-bold text-success">12.5K</p>
          </motion.div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles by title or content..."
                className="w-full h-12 pl-12 pr-4 bg-white border-2 border-border rounded-xl 
                         focus:border-primary focus:outline-none focus:ring-4 
                         focus:ring-primary/20 transition-all text-text"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-text-tertiary" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Sort Dropdown */}
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="min-w-[140px] border-2"
                options={[
                  { label: 'Latest', value: 'latest' },
                  { label: 'Most Popular', value: 'popular' },
                  { label: 'Trending', value: 'trending' },
                ]}
              />

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                  showFilters 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">Filters</span>
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-white rounded-lg border border-border p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-primary text-white' 
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text flex items-center gap-2">
                    <FunnelIcon className="w-5 h-5 text-primary" />
                    Filter Articles
                  </h3>
                  <button
                    onClick={() => {
                      setSearch('')
                      setCategoryId('all')
                      setFeaturedOnly(false)
                      setSortBy('latest')
                    }}
                    className="text-sm text-text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Reset All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Category
                    </label>
                    <Select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      options={[
                        { label: 'All Categories', value: 'all' },
                        ...(categoriesQuery.data ?? []).map((category) => ({ label: category.name, value: category.id })),
                      ]}
                    />
                  </div>

                  {/* Featured Filter */}
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featuredOnly}
                        onChange={(e) => setFeaturedOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-text-secondary">Show featured only</span>
                    </label>
                  </div>

                  {/* Popular Tags */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2">
                      Popular Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Design', 'Tips', 'Projects', 'Products', 'Trends'].map((tag) => (
                        <button
                          key={tag}
                          className="px-3 py-1 bg-background rounded-full text-xs text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {blogsQuery.isLoading && (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white rounded-xl border border-border overflow-hidden ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                <div className={`${viewMode === 'list' ? 'w-48' : 'w-full'} h-48 bg-gradient-to-r from-background via-primary/5 to-background skeleton`} />
                <div className="p-4 flex-1">
                  <div className="h-4 w-24 bg-background rounded skeleton mb-2" />
                  <div className="h-6 w-40 bg-background rounded skeleton mb-2" />
                  <div className="h-4 w-full bg-background rounded skeleton" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        {blogsQuery.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-error/10 border border-error/20 rounded-xl text-center"
          >
            <NewspaperIcon className="w-16 h-16 mx-auto text-error/30 mb-4" />
            <h3 className="text-lg font-semibold text-error-dark mb-2">Unable to Load Articles</h3>
            <p className="text-error/80 mb-4">There was an error loading the blog posts. Please try again later.</p>
            <Button variant="outline" onClick={() => blogsQuery.refetch()}>
              Retry
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {!blogsQuery.isLoading && !blogsQuery.isError && sortedBlogs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <NewspaperIcon className="w-20 h-20 mx-auto text-text-tertiary/30 mb-4" />
            <h3 className="text-xl font-semibold text-text mb-2">No Articles Found</h3>
            <p className="text-text-secondary mb-4">Try adjusting your search or filter criteria</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('')
                setCategoryId('all')
                setFeaturedOnly(false)
              }}
            >
              Clear Filters
            </Button>
          </motion.div>
        )}

        {/* Blog Grid/List */}
        {!blogsQuery.isLoading && !blogsQuery.isError && sortedBlogs.length > 0 && (
          <>
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}
            >
              {sortedBlogs.map((blog, index) => {
                const imageUrl = getBlogImage(blog)
                const readingTime = getReadingTime(blog.content)
                const isBookmarked = bookmarked.includes(blog.id)

                if (viewMode === 'list') {
                  return (
                    <motion.article
                      key={blog.id}
                      variants={fadeInUp}
                      layout
                      onClick={() => setSelectedBlog(blog)}
                      className="flex flex-col md:flex-row bg-white rounded-xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer group"
                    >
                      {/* Image */}
                      <div className="md:w-64 h-48 bg-gradient-to-br from-primary/5 to-secondary/5 overflow-hidden">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <NewspaperIcon className="w-16 h-16 text-primary/20" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-text-tertiary">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {blog.category_name || 'General'}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {formatRelativeTime(blog.publish_date || blog.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {readingTime} min read
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBookmark(blog.id)
                            }}
                            className="p-2 hover:bg-background rounded-full transition-colors"
                          >
                            {isBookmarked ? (
                              <BookmarkIcon className="w-4 h-4 text-primary fill-primary" />
                            ) : (
                              <BookmarkIcon className="w-4 h-4 text-text-tertiary" />
                            )}
                          </button>
                        </div>

                        <h2 className="text-xl font-bold text-text group-hover:text-primary transition-colors mb-2">
                          {blog.title}
                        </h2>

                        <p className="text-text-secondary line-clamp-2 mb-4">
                          {blog.excerpt || 'Click to read the full article...'}
                        </p>

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-4 text-sm text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-4 h-4" />
                            {blog.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                            {blog.comment_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookmarkIcon className="w-4 h-4" />
                            {blog.bookmark_count || 0}
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  )
                }

                // Grid View
                return (
                  <motion.article
                    key={blog.id}
                    variants={fadeInUp}
                    layout
                    onClick={() => setSelectedBlog(blog)}
                    className="group bg-white rounded-xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <NewspaperIcon className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-3 left-3">
                        <span className="bg-primary/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                          {blog.category_name || 'General'}
                        </span>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBookmark(blog.id)
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all"
                      >
                        {isBookmarked ? (
                          <BookmarkIcon className="w-4 h-4 text-primary fill-primary" />
                        ) : (
                          <BookmarkIcon className="w-4 h-4 text-text-tertiary" />
                        )}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Meta Info */}
                      <div className="flex items-center gap-2 text-xs text-text-tertiary mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatRelativeTime(blog.publish_date || blog.created_at)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {readingTime} min
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-bold text-text group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {blog.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-text-secondary text-sm line-clamp-2 mb-4">
                        {blog.excerpt || 'Click to read the full article...'}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-text-tertiary">
                          <span className="flex items-center gap-1">
                            <HeartIcon className="w-3 h-3" />
                            {blog.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="w-3 h-3" />
                            {blog.comment_count || 0}
                          </span>
                        </div>
                        <Link
                          to={blog.slug ? `/blog/${blog.slug}` : '/blog'}
                          onClick={(event) => event.stopPropagation()}
                          className="text-xs text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1"
                        >
                          Read More
                          <ChevronRightIcon className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Featured Badge */}
                      {blog.is_featured && (
                        <div className="absolute top-3 right-3">
                          <span className="bg-secondary text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            Featured
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>

            {/* Results Summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex items-center justify-between text-sm text-text-tertiary"
            >
              <span className="flex items-center gap-2">
                <NewspaperIcon className="w-4 h-4" />
                Showing {sortedBlogs.length} article{sortedBlogs.length === 1 ? '' : 's'}
              </span>
              <span>
                Page 1 of {Math.ceil(sortedBlogs.length / 9)}
              </span>
            </motion.div>
          </>
        )}
      </div>

      {/* Newsletter Section */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-text mb-3">
              Stay Inspired
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Get the latest design trends and project stories delivered to your inbox
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-12 px-4 bg-white border-2 border-border rounded-xl 
                         focus:border-primary focus:outline-none focus:ring-4 
                         focus:ring-primary/20 transition-all text-text"
              />
              <Button className="h-12 px-6">
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-text-tertiary mt-3 text-center">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Detail Modal */}
      <AnimatePresence>
        {selectedBlog && <BlogDetailModal />}
      </AnimatePresence>
    </div>
  )
}

export default BlogPage
