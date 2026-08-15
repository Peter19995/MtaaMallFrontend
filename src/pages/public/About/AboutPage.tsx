import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  HomeModernIcon,
  LightBulbIcon,
  SparklesIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
  StarIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TrophyIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { AppTheme } from '@constants/theme'

const values = [
  {
    title: 'Design That Performs',
    description:
      'We combine visual quality with practical planning so every space looks strong and works well day to day.',
    icon: LightBulbIcon,
    color: 'from-blue-400 to-cyan-400',
    stats: '98% client satisfaction',
  },
  {
    title: 'Reliable Delivery',
    description:
      'From scope to handover, we run clear workflows and timelines so clients always know what is happening.',
    icon: WrenchScrewdriverIcon,
    color: 'from-orange-400 to-red-400',
    stats: '150+ projects delivered',
  },
  {
    title: 'People First',
    description:
      'We collaborate closely with homeowners, developers, and businesses to create spaces that reflect real needs.',
    icon: UserGroupIcon,
    color: 'from-green-400 to-emerald-400',
    stats: '95% repeat clients',
  },
]

const milestones = [
  { 
    year: '2019', 
    text: 'MtaaMall launched to serve premium interior styling projects.',
    icon: SparklesIcon,
    achievement: 'Company Founded'
  },
  { 
    year: '2021', 
    text: 'Expanded into curtain installation and post-construction cleaning services.',
    icon: HomeModernIcon,
    achievement: 'Service Expansion'
  },
  { 
    year: '2024', 
    text: 'Introduced integrated project and inventory operations for better delivery.',
    icon: BuildingOfficeIcon,
    achievement: 'Operations Upgrade'
  },
  { 
    year: '2026', 
    text: 'Scaled public portfolio and digital channels for faster client discovery.',
    icon: TrophyIcon,
    achievement: 'Digital Growth'
  },
]

const teamMembers = [
  {
    name: 'Sarah Johnson',
    role: 'Lead Designer',
    bio: '10+ years experience in residential and commercial interior design.',
    image: 'https://images.unsplash.com/photo-1494790108777-385d3001d8e7?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Michael Omondi',
    role: 'Project Manager',
    bio: 'Expert in construction coordination and quality assurance.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Emily Wanjiku',
    role: 'Senior Designer',
    bio: 'Specializes in curtain design and soft furnishings.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
  },
]

const stats = [
  { label: 'Projects Completed', value: '150+', icon: TrophyIcon },
  { label: 'Happy Clients', value: '200+', icon: HeartIcon },
  { label: 'Years Experience', value: '7+', icon: ClockIcon },
  { label: 'Quality Guarantee', value: '100%', icon: ShieldCheckIcon },
]

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const scaleOnHover = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 }
}

const AboutPage = () => {
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-white to-background overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Hero Section with Parallax */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative overflow-hidden pt-24"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 backdrop-blur-sm px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-lg"
            >
              <SparklesIcon className="h-4 w-4" />
              About MtaaMall
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-5xl font-bold leading-tight text-text sm:text-6xl lg:text-7xl"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              We build interiors that feel{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                intentional, polished, and livable.
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary"
            >
              MtaaMall is a design and execution company focused on transforming homes,
              offices, and commercial spaces through high-quality styling, fit-out, and finishing.
              We deliver projects across curtain installation, interior design, wall painting,
              furniture customization, and post-construction cleaning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link to="/projects">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    View Our Projects
                    <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary-dark to-primary"
                    initial={{ x: '100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              </Link>
              <Link to="/services">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl border-2 border-border bg-white/80 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-text-secondary hover:border-primary/30 hover:text-primary transition-all shadow-lg"
                >
                  Explore Services
                </motion.button>
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 grid gap-4 sm:grid-cols-3"
            >
              {[
                { label: 'Project Focus', value: 'Residential & Commercial', icon: BuildingOfficeIcon },
                { label: 'Core Strength', value: 'Visual Design + Delivery', icon: StarIcon },
                { label: 'Coverage', value: 'End-to-End Interiors', icon: HomeModernIcon },
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.label}
                    whileHover={{ y: -5 }}
                    className="group rounded-2xl border border-border bg-white/80 backdrop-blur-sm p-4 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    <p className="mt-2 text-xs uppercase tracking-wide text-text-tertiary">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-text">{item.value}</p>
                  </motion.div>
                )
              })}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <motion.img
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=1200&q=80"
                alt="Interior styling consultation"
                className="h-72 w-full rounded-3xl object-cover shadow-2xl sm:col-span-2"
                loading="lazy"
              />
              <motion.img
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1616137422495-1e9e46e2aa77?auto=format&fit=crop&w=800&q=80"
                alt="Curtain installation details"
                className="h-56 w-full rounded-3xl object-cover shadow-xl"
                loading="lazy"
              />
              <motion.img
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80"
                alt="Modern office interior project"
                className="h-56 w-full rounded-3xl object-cover shadow-xl"
                loading="lazy"
              />
            </div>

            {/* Floating Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-5 -left-5 rounded-2xl border border-primary/25 bg-white/95 p-4 shadow-xl backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Since 2019</p>
              <p className="mt-1 text-sm font-semibold text-text">7+ Years of Excellence</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 shadow-lg hover:shadow-xl transition-all group"
              >
                <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-2xl font-bold text-primary mt-2">{stat.value}</p>
                <p className="text-xs text-text-tertiary mt-1">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Values Section */}
      <motion.section
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <motion.div variants={fadeInUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <HeartIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Our Values
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            What We Stand For
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Principles that guide every project and client interaction
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value, index) => {
            const Icon = value.icon
            return (
              <motion.article
                key={value.title}
                variants={fadeInUp}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-lg hover:shadow-2xl transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-sm text-text-tertiary">0{index + 1}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-text group-hover:text-primary transition-colors">
                    {value.title}
                  </h3>
                  
                  <p className="mt-3 text-text-secondary leading-relaxed">
                    {value.description}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-primary font-medium flex items-center gap-1">
                      <CheckBadgeIcon className="w-4 h-4" />
                      {value.stats}
                    </p>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </motion.section>

      {/* Journey & Team Section */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Journey Timeline */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <ClockIcon className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-text">Our Journey</h2>
            </div>
            
            <p className="text-text-secondary mb-6">
              We continue to evolve our design quality and operational systems to serve clients faster
              with stronger outcomes.
            </p>
            
            <div className="space-y-4">
              {milestones.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative flex gap-4 rounded-xl bg-background p-4 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {item.year}
                      </span>
                      <div className="w-0.5 h-full bg-border group-last:hidden mt-2" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">{item.achievement}</p>
                      <p className="text-sm text-text-secondary">{item.text}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Team Section */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <UserGroupIcon className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-text">Meet Our Team</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {teamMembers.map((member, index) => (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                    className="text-center group"
                  >
                    <div className="relative mb-3 inline-block">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="h-24 w-24 rounded-full object-cover border-4 border-primary/20 group-hover:border-primary transition-all"
                      />
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-success rounded-full border-2 border-white flex items-center justify-center">
                        <CheckBadgeIcon className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-text">{member.name}</h3>
                    <p className="text-xs text-primary mt-1">{member.role}</p>
                    <p className="text-xs text-text-tertiary mt-2">{member.bio}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* How We Work */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 shadow-lg sm:p-8"
            >
              <h2 className="text-2xl font-bold text-text mb-4">How We Work With You</h2>
              <div className="space-y-4">
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl"
                >
                  <HomeModernIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">We start with discovery to understand your space, style, and constraints.</p>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl"
                >
                  <LightBulbIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">We propose practical concepts, materials, and a delivery schedule.</p>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl"
                >
                  <WrenchScrewdriverIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">We execute with quality checks and clear progress updates.</p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section with Image */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-primary to-secondary"
        >
          <img
            src="https://images.unsplash.com/photo-1617104551722-3b2d51366499?auto=format&fit=crop&w=1600&q=80"
            alt="Finished premium interior space"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            loading="lazy"
          />
          
          <div className="relative p-8 sm:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Space?
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Let's bring your vision to life with our expert design and execution team.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/gallery">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  View Gallery
                </motion.button>
              </Link>
              <Link to="/blog">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/30 hover:bg-white/30 transition-all flex items-center gap-2"
                >
                  Read Design Insights
                  <ArrowRightIcon className="h-4 w-4" />
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Contact Info Bar */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.a
            href="tel:+254700000000"
            whileHover={{ y: -5 }}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <PhoneIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Call Us</p>
              <p className="text-sm font-semibold text-text">+254 700 000 000</p>
            </div>
          </motion.a>
          
          <motion.a
            href="mailto:info@mtaamall.com"
            whileHover={{ y: -5 }}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <EnvelopeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Email Us</p>
              <p className="text-sm font-semibold text-text">info@mtaamall.com</p>
            </div>
          </motion.a>
          
          <motion.a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -5 }}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <MapPinIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Visit Us</p>
              <p className="text-sm font-semibold text-text">Nairobi, Kenya</p>
            </div>
          </motion.a>
        </div>
      </section>
    </div>
  )
}

export default AboutPage