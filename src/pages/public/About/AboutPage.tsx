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
    title: 'Trust in Every Order',
    description:
      'We are building a marketplace where clear product information, dependable sellers, and secure checkout help customers shop confidently.',
    icon: LightBulbIcon,
    color: 'from-blue-400 to-cyan-400',
    stats: 'Shop with confidence',
  },
  {
    title: 'Convenience That Works',
    description:
      'From discovery to delivery, we keep the shopping journey simple, transparent, and suited to everyday life in Kenya.',
    icon: WrenchScrewdriverIcon,
    color: 'from-orange-400 to-red-400',
    stats: 'Simple from cart to door',
  },
  {
    title: 'Local Growth',
    description:
      'We connect shoppers with local businesses and give sellers better ways to showcase products, serve customers, and grow.',
    icon: UserGroupIcon,
    color: 'from-green-400 to-emerald-400',
    stats: 'Built for shoppers and sellers',
  },
]

const milestones = [
  { 
    year: 'Origin',
    text: 'The idea for MtaaMall began with a simple goal: make local online shopping easier and more trustworthy.',
    icon: SparklesIcon,
    achievement: 'The Idea'
  },
  { 
    year: 'Build',
    text: 'We developed one platform for products, sellers, orders, inventory, payments, and customer support.',
    icon: HomeModernIcon,
    achievement: 'Marketplace Foundation'
  },
  { 
    year: 'Launch',
    text: 'MtaaMall opened its digital doors to connect Kenyan shoppers with a broader range of local products.',
    icon: BuildingOfficeIcon,
    achievement: 'Online Marketplace'
  },
  { 
    year: 'Next',
    text: 'We are expanding seller access, product choice, payments, and fulfilment to serve more communities.',
    icon: TrophyIcon,
    achievement: 'Growing Across Kenya'
  },
]

const teamMembers = [
  {
    name: 'Sarah Johnson',
    role: 'Customer Experience Lead',
    bio: 'Focused on making every step of shopping simple, clear, and helpful.',
    image: 'https://images.unsplash.com/photo-1494790108777-385d3001d8e7?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Michael Omondi',
    role: 'Marketplace Operations Lead',
    bio: 'Coordinates sellers, products, orders, and fulfilment standards.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Emily Wanjiku',
    role: 'Seller Growth Lead',
    bio: 'Helps local businesses reach customers and grow through digital commerce.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80',
  },
]

const stats = [
  { label: 'Product Categories', value: 'Many', icon: TrophyIcon },
  { label: 'Community Focus', value: 'Kenya', icon: HeartIcon },
  { label: 'Shopping Access', value: '24/7', icon: ClockIcon },
  { label: 'Secure Experience', value: 'Always', icon: ShieldCheckIcon },
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
              We bring the mall{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                closer to your mtaa.
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary"
            >
              MtaaMall is a Kenyan online marketplace built to make everyday shopping simpler.
              We connect customers with trusted sellers, useful products, convenient payment
              options, and dependable delivery—all through one accessible platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link to="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Shopping
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
                  Explore MtaaMall
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
                { label: 'For Shoppers', value: 'Choice, Value & Convenience', icon: BuildingOfficeIcon },
                { label: 'For Sellers', value: 'Reach, Tools & Growth', icon: StarIcon },
                { label: 'Our Focus', value: 'Kenyan Communities', icon: HomeModernIcon },
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
                src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80"
                alt="Shopping from local businesses through MtaaMall"
                className="h-72 w-full rounded-3xl object-cover shadow-2xl sm:col-span-2"
                loading="lazy"
              />
              <motion.img
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80"
                alt="Convenient and secure online payments"
                className="h-56 w-full rounded-3xl object-cover shadow-xl"
                loading="lazy"
              />
              <motion.img
                whileHover={{ scale: 1.02 }}
                src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80"
                alt="Friendly marketplace customer support"
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
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Built in Kenya</p>
              <p className="mt-1 text-sm font-semibold text-text">Shopping made local and convenient</p>
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
            Principles that guide every order, partnership, and customer interaction
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
              We are building MtaaMall step by step around the real needs of Kenyan shoppers,
              sellers, and growing communities.
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
                  <p className="text-sm text-text-secondary">Shoppers discover products, compare choices, and buy with confidence.</p>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl"
                >
                  <LightBulbIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">Sellers list products, manage stock and orders, and reach more customers.</p>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl"
                >
                  <WrenchScrewdriverIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-text-secondary">MtaaMall supports secure checkout, clear updates, and dependable fulfilment.</p>
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
            src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80"
            alt="Discover products from trusted sellers on MtaaMall"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
            loading="lazy"
          />
          
          <div className="relative p-8 sm:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Find Your Next Favourite?
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8">
              Explore products from trusted sellers and enjoy shopping designed around your everyday needs.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/products">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  Shop Products
                </motion.button>
              </Link>
              <Link to="/blog">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold border border-white/30 hover:bg-white/30 transition-all flex items-center gap-2"
                >
                  Read Shopping Guides
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
