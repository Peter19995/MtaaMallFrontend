import { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ShareIcon,
  HeartIcon,
  BookmarkIcon,
  ChatBubbleLeftIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  NewspaperIcon,
  TagIcon,
  EyeIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import {
  getPublicBlogRequest,
  listPublicBlogCommentsRequest,
  type BlogCommentResponse
} from '@api/modules/blogs.api'
import { resolveMediaUrl } from '@utils/media'
import { Button } from '@components/common'
import { AppTheme } from '@constants/theme'

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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

const getReadingTime = (content?: string): number => {
  if (!content) return 3
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

// Mock related posts
const relatedPosts = [
  {
    id: 1,
    title: '10 Interior Design Trends for 2024',
    slug: 'interior-design-trends-2024',
    image: 'https://images.unsplash.com/photo-1615529162924-f86053884682?auto=format&fit=crop&w=600&q=80',
    category: 'Design Trends',
    readTime: 5
  },
  {
    id: 2,
    title: 'How to Choose the Perfect Curtains',
    slug: 'choose-perfect-curtains',
    image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=600&q=80',
    category: 'Product Guide',
    readTime: 4
  },
  {
    id: 3,
    title: 'Sustainable Materials in Modern Design',
    slug: 'sustainable-materials-design',
    image: 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=600&q=80',
    category: 'Sustainability',
    readTime: 6
  }
]

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

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>()
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [commentText, setCommentText] = useState('')

  const blogQuery = useQuery({
    queryKey: ['blogs', 'public', 'detail', slug],
    queryFn: () => {
      if (!slug) {
        throw new Error('Missing blog slug')
      }
      return getPublicBlogRequest(slug)
    },
    enabled: Boolean(slug)
  })

  const commentsQuery = useQuery({
    queryKey: ['blogs', 'public', 'comments', blogQuery.data?.id],
    queryFn: () => {
      if (!blogQuery.data?.id) {
        throw new Error('Missing blog id')
      }
      return listPublicBlogCommentsRequest(blogQuery.data.id, { limit: 50 })
    },
    enabled: Boolean(blogQuery.data?.id)
  })

  const comments = useMemo<BlogCommentResponse[]>(() => commentsQuery.data ?? [], [commentsQuery.data])
  const heroImage = resolveMediaUrl((blogQuery.data?.image_urls ?? [])[0])
  const blog = blogQuery.data
  const readingTime = getReadingTime(blog?.content)

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  }

  const handleShare = (platform: string) => {
    const url = window.location.href
    const title = blog?.title || 'MtaaMall Blog'
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`
    }
    
    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank')
    setShowShareMenu(false)
  }

  if (blogQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
        {/* Skeleton Loader */}
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="h-6 w-32 bg-background rounded skeleton mb-8" />
          
          <div className="space-y-6">
            <div className="h-12 w-3/4 bg-background rounded skeleton" />
            <div className="h-6 w-48 bg-background rounded skeleton" />
            <div className="h-96 w-full bg-gradient-to-r from-background via-primary/5 to-background rounded-2xl skeleton" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-background rounded skeleton" />
              <div className="h-4 w-full bg-background rounded skeleton" />
              <div className="h-4 w-3/4 bg-background rounded skeleton" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (blogQuery.isError || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-white to-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <NewspaperIcon className="w-20 h-20 mx-auto text-error/30 mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Article Not Found</h1>
          <p className="text-text-secondary mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog">
            <Button>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Blogs
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Hero Section with Parallax */}
      {heroImage && (
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img 
              src={heroImage} 
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
          </motion.div>
          
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto max-w-4xl w-full px-4 pb-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link 
                  to="/blog" 
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 group"
                >
                  <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Blogs
                </Link>
                
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full">
                    {blog.category_name || 'General'}
                  </span>
                  {blog.is_featured && (
                    <span className="bg-secondary text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-3xl">
                  {blog.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-white/80">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    {blog.author_name || 'MtaaMall'}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    {formatDateTime(blog.publish_date || blog.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {readingTime} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {blog.view_count || 0} views
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Back link (if no hero image) */}
        {!heroImage && (
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Blogs
          </Link>
        )}

        <motion.article
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="prose prose-lg max-w-none"
        >
          {/* Excerpt */}
          {blog.excerpt && (
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-6 mb-8 border border-primary/10">
              <p className="text-lg text-text-secondary italic leading-relaxed">
                "{blog.excerpt}"
              </p>
            </div>
          )}

          {/* Content */}
          <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">
            {blog.content}
          </div>
        </motion.article>

        {/* Engagement Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between py-6 mt-8 border-y border-border"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background transition-colors group"
            >
              {isLiked ? (
                <HeartIconSolid className="w-5 h-5 text-error" />
              ) : (
                <HeartIcon className="w-5 h-5 text-text-secondary group-hover:text-error transition-colors" />
              )}
              <span className="text-sm font-medium">{likeCount || blog.like_count || 0}</span>
            </button>

            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background transition-colors">
              <ChatBubbleLeftIcon className="w-5 h-5 text-text-secondary" />
              <span className="text-sm font-medium">{blog.comment_count || comments.length}</span>
            </button>

            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background transition-colors"
            >
              <BookmarkIcon className={`w-5 h-5 ${isBookmarked ? 'text-primary fill-primary' : 'text-text-secondary'}`} />
              <span className="text-sm font-medium">Save</span>
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-background transition-colors"
            >
              <ShareIcon className="w-5 h-5 text-text-secondary" />
              <span className="text-sm font-medium">Share</span>
            </button>

            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border p-2 z-10"
                >
                  {['Twitter', 'Facebook', 'LinkedIn', 'Pinterest'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => handleShare(platform.toLowerCase())}
                      className="w-full text-left px-4 py-2 text-sm text-text hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      Share on {platform}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Author Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-6 my-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
              {blog.author_name?.charAt(0) || 'J'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text">
                {blog.author_name || 'MtaaMall'}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {blog.author_bio || 'Interior design experts dedicated to creating beautiful and functional spaces.'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-text-tertiary flex items-center gap-1">
                  <CheckBadgeIcon className="w-3 h-3 text-primary" />
                  Expert Contributor
                </span>
                <span className="text-xs text-text-tertiary">
                  {blog.author_articles || 15} articles
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Comments Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-2">
            <ChatBubbleLeftIcon className="w-6 h-6 text-primary" />
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          <div className="bg-white rounded-xl border border-border p-6 mb-8">
            <h3 className="text-sm font-semibold text-text mb-4">Leave a comment</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <div className="flex justify-end mt-3">
              <Button disabled={!commentText.trim()}>
                Post Comment
              </Button>
            </div>
          </div>

          {/* Comments List */}
          {commentsQuery.isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-background rounded-full skeleton" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-background rounded skeleton mb-2" />
                      <div className="h-3 w-24 bg-background rounded skeleton" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-background rounded skeleton" />
                    <div className="h-3 w-3/4 bg-background rounded skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : commentsQuery.isError ? (
            <div className="text-center py-8">
              <p className="text-error">Failed to load comments</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-border">
              <ChatBubbleLeftIcon className="w-12 h-12 mx-auto text-text-tertiary/30 mb-3" />
              <p className="text-text-secondary">No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <motion.article
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text">{comment.user_name || 'Anonymous'}</p>
                        <p className="text-xs text-text-tertiary flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatRelativeTime(comment.created_at)}
                        </p>
                      </div>
                    </div>
                    {comment.is_verified && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <CheckBadgeIcon className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary">{comment.content}</p>
                </motion.article>
              ))}
            </div>
          )}
        </motion.section>

        {/* Related Posts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16"
        >
          <h2 className="text-2xl font-bold text-text mb-6">Related Articles</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
              >
                <Link to={`/blog/${post.slug}`}>
                  <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-2 left-2 text-xs text-white bg-primary/80 backdrop-blur-sm px-2 py-1 rounded-full">
                      {post.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-text group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-1">{post.readTime} min read</p>
                </Link>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* Newsletter CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center"
        >
          <h3 className="text-xl font-bold text-text mb-2">Enjoyed this article?</h3>
          <p className="text-text-secondary mb-4">Subscribe to our newsletter for more design insights</p>
          <div className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 h-12 px-4 bg-white border-2 border-border rounded-xl 
                       focus:border-primary focus:outline-none focus:ring-4 
                       focus:ring-primary/20 transition-all"
            />
            <Button className="h-12 px-6">
              Subscribe
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default BlogPost