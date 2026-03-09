import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRightIcon, 
  CheckBadgeIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  HomeModernIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  PhotoIcon,
  BuildingOfficeIcon,
  SwatchIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import { Button } from '@components/common'
import { listPublicProjectsRequest, type PublicProjectResponse } from '@api/modules/projects.api'
import { AppTheme } from '@constants/theme'
import { resolveMediaUrl } from '@utils/media'

const deliverySteps = [
  {
    title: 'Consultation & Discovery',
    description: 'Understanding your vision, needs, and space requirements',
    icon: UserGroupIcon
  },
  {
    title: 'Design Concept & Selection',
    description: 'Creating mood boards, selecting materials, and finalizing designs',
    icon: SwatchIcon
  },
  {
    title: 'Implementation & Quality',
    description: 'Executing the plan with regular quality checks and updates',
    icon: WrenchScrewdriverIcon
  },
  {
    title: 'Handover & Support',
    description: 'Final walkthrough, touch-ups, and after-service care',
    icon: BuildingOfficeIcon
  }
]

const projectTypes = [
  { value: 'all', label: 'All Projects', icon: HomeModernIcon },
  { value: 'curtain_installation', label: 'Curtain Installation', icon: WrenchScrewdriverIcon },
  { value: 'post_construction_cleaning', label: 'Post Construction', icon: SparklesIcon },
  { value: 'interior_design', label: 'Interior Design', icon: SwatchIcon },
  { value: 'furniture_customization', label: 'Furniture Custom', icon: BuildingOfficeIcon },
  { value: 'wall_painting', label: 'Wall Painting', icon: SwatchIcon }
]

const prettifyLabel = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) return 'TBD'
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateValue))
}

const getStatusConfig = (status: string): { label: string; className: string; icon: any } => {
  const normalized = status.toLowerCase()
  
  if (normalized === 'completed') {
    return {
      label: 'Completed',
      className: 'bg-success/10 text-success border-success/20',
      icon: CheckBadgeIcon
    }
  }
  if (normalized === 'in_progress') {
    return {
      label: 'In Progress',
      className: 'bg-primary/10 text-primary border-primary/20',
      icon: ClockIcon
    }
  }
  if (normalized === 'approved') {
    return {
      label: 'Approved',
      className: 'bg-success/10 text-success border-success/20',
      icon: CheckBadgeIcon
    }
  }
  if (normalized === 'quoted') {
    return {
      label: 'Quoted',
      className: 'bg-secondary/10 text-secondary-dark border-secondary/20',
      icon: SparklesIcon
    }
  }
  return {
    label: prettifyLabel(status),
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: ClockIcon
  }
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

const ProjectsPage = () => {
  const [selectedType, setSelectedType] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<PublicProjectResponse | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'public', 0, 100],
    queryFn: () => listPublicProjectsRequest({ skip: 0, limit: 100 })
  })

  const projects = useMemo<PublicProjectResponse[]>(
    () => projectsQuery.data ?? [],
    [projectsQuery.data]
  )

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Type filter
      if (selectedType !== 'all' && project.project_type !== selectedType) {
        return false
      }
      
      // Search filter
      if (search) {
        const term = search.toLowerCase()
        return project.project_title.toLowerCase().includes(term) ||
               project.description?.toLowerCase().includes(term) ||
               project.status.toLowerCase().includes(term)
      }
      
      return true
    })
  }, [projects, selectedType, search])

  // Statistics
  const stats = useMemo(() => {
    const completed = projects.filter(p => p.status.toLowerCase() === 'completed').length
    const inProgress = projects.filter(p => p.status.toLowerCase() === 'in_progress').length
    const totalImages = projects.reduce((sum, p) => sum + (p.image_urls?.length || 0), 0)
    
    return { completed, inProgress, totalImages }
  }, [projects])

  // Project detail modal
  const ProjectDetailModal = () => {
    if (!selectedProject) return null

    const status = getStatusConfig(selectedProject.status)
    const StatusIcon = status.icon
    const imageUrls = (selectedProject.image_urls ?? [])
      .map((url) => resolveMediaUrl(url))
      .filter((url): url is string => Boolean(url))

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={() => setSelectedProject(null)}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Image Gallery */}
          {imageUrls.length > 0 && (
            <div className="relative h-64 bg-gradient-to-br from-primary/10 to-secondary/10">
              <img 
                src={imageUrls[0]} 
                alt={selectedProject.project_title}
                className="w-full h-full object-cover"
              />
              {imageUrls.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  {imageUrls.length} photos
                </div>
              )}
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border ${status.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-medium text-text-tertiary">
                    {prettifyLabel(selectedProject.project_type)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text">{selectedProject.project_title}</h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 hover:bg-background rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <p className="text-text-secondary mb-6 leading-relaxed">
              {selectedProject.description || 'Project details will be shared soon.'}
            </p>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-text-tertiary mb-1">Start Date</p>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-text">{formatDate(selectedProject.start_date)}</span>
                </div>
              </div>
              <div className="bg-background rounded-xl p-4">
                <p className="text-xs text-text-tertiary mb-1">Expected Completion</p>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-secondary" />
                  <span className="font-medium text-text">{formatDate(selectedProject.expected_end_date)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link to="/services" className="flex-1">
                <Button size="lg" className="w-full">
                  Start Similar Project
                </Button>
              </Link>
              <Link to="/contact" className="flex-1">
                <Button size="lg" variant="outline" className="w-full">
                  Inquire About This Project
                </Button>
              </Link>
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
              <SparklesIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Our Portfolio
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text mb-4">
              Transforming Spaces into{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Works of Art
              </span>
            </h1>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Explore our completed projects and see how we bring interior design visions to life.
            </p>
          </motion.div>
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
            <p className="text-xs text-text-tertiary mb-1">Total Projects</p>
            <p className="text-2xl font-bold text-primary">{projects.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Completed</p>
            <p className="text-2xl font-bold text-success">{stats.completed}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">In Progress</p>
            <p className="text-2xl font-bold text-secondary">{stats.inProgress}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-border p-4"
          >
            <p className="text-xs text-text-tertiary mb-1">Project Photos</p>
            <p className="text-2xl font-bold text-accent">{stats.totalImages}</p>
          </motion.div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects by name or description..."
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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                showFilters 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white border-border text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Filter by Type</span>
            </button>
          </div>
        </div>

        {/* Project Type Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-xl border border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {projectTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                          selectedType === type.value
                            ? 'bg-primary text-white'
                            : 'bg-background text-text-secondary hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Projects Grid */}
        {projectsQuery.isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-border overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-r from-background via-primary/5 to-background skeleton" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-background rounded-full skeleton" />
                    <div className="h-6 w-20 bg-background rounded-full skeleton" />
                  </div>
                  <div className="h-6 w-3/4 bg-background rounded skeleton" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-background rounded skeleton" />
                    <div className="h-4 w-2/3 bg-background rounded skeleton" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {projectsQuery.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-error/10 border border-error/20 rounded-xl text-center"
          >
            <BuildingOfficeIcon className="w-16 h-16 mx-auto text-error/30 mb-4" />
            <h3 className="text-lg font-semibold text-error-dark mb-2">Unable to Load Projects</h3>
            <p className="text-error/80 mb-4">There was an error loading the projects. Please try again later.</p>
            <Button variant="outline" onClick={() => projectsQuery.refetch()}>
              Retry
            </Button>
          </motion.div>
        )}

        {!projectsQuery.isLoading && !projectsQuery.isError && filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <HomeModernIcon className="w-20 h-20 mx-auto text-text-tertiary/30 mb-4" />
            <h3 className="text-xl font-semibold text-text mb-2">No Projects Found</h3>
            <p className="text-text-secondary mb-4">Try adjusting your search or filter criteria</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearch('')
                setSelectedType('all')
              }}
            >
              Clear Filters
            </Button>
          </motion.div>
        )}

        {!projectsQuery.isLoading && !projectsQuery.isError && filteredProjects.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project) => {
              const imageUrls = (project.image_urls ?? [])
                .map((url) => resolveMediaUrl(url))
                .filter((url): url is string => Boolean(url))
              const primaryImage = imageUrls[0]
              const status = getStatusConfig(project.status)
              const StatusIcon = status.icon

              return (
                <motion.article
                  key={`${project.project_title}-${project.start_date ?? 'na'}`}
                  variants={fadeInUp}
                  layout
                  onClick={() => setSelectedProject(project)}
                  className="group relative bg-white rounded-xl border border-border overflow-hidden 
                           hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    {primaryImage ? (
                      <img 
                        src={primaryImage} 
                        alt={project.project_title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                        <HomeModernIcon className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    
                    {/* Image Count Badge */}
                    {imageUrls.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <PhotoIcon className="w-3 h-3" />
                        {imageUrls.length}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Status and Type */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs font-medium text-text-tertiary">
                        {prettifyLabel(project.project_type)}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-text group-hover:text-primary transition-colors mb-2">
                      {project.project_title}
                    </h2>

                    {/* Description */}
                    <p className="text-text-secondary text-sm line-clamp-2 mb-4">
                      {project.description || 'Project details will be shared soon.'}
                    </p>

                    {/* Timeline */}
                    <div className="flex items-center justify-between text-xs text-text-tertiary border-t border-border pt-3">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        <span>Start: {formatDate(project.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>End: {formatDate(project.expected_end_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.article>
              )
            })}
          </motion.div>
        )}

        {/* Results Summary */}
        {!projectsQuery.isLoading && !projectsQuery.isError && filteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex items-center justify-between text-sm text-text-tertiary"
          >
            <span className="flex items-center gap-2">
              <HomeModernIcon className="w-4 h-4" />
              Showing {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}
            </span>
          </motion.div>
        )}
      </div>

      {/* Process Section */}
      <section className="bg-gradient-to-br from-primary/5 to-secondary/5 py-16 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-text mb-3">
              Our Project Delivery Process
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              We follow a proven methodology to ensure every project exceeds expectations
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {deliverySteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative bg-white rounded-xl border border-border p-6 shadow-sm"
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="mt-4 mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary">{step.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border p-8 text-center">
          <h2 className="text-2xl font-bold text-text mb-3">Ready to Start Your Project?</h2>
          <p className="text-text-secondary max-w-2xl mx-auto mb-6">
            Let's bring your vision to life. Our team is ready to discuss your ideas and provide a customized solution.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/services">
              <Button size="lg">
                Request a Service
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && <ProjectDetailModal />}
      </AnimatePresence>
    </div>
  )
}

export default ProjectsPage
