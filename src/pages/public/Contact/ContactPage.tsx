import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRightIcon,
  ClockIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  SparklesIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  HeartIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import ContactForm from './ContactForm'
import Map from './Map'
import { AppTheme } from '@constants/theme'

const contactCards = [
  {
    title: 'Call us',
    value: '+254 700 000 000',
    note: 'Mon - Sat, 8:00 AM - 6:00 PM',
    icon: PhoneIcon,
    action: 'tel:+254700000000',
    badge: 'Direct Line',
  },
  {
    title: 'Email',
    value: 'info@julianinteriors.com',
    note: 'We respond within 24 hours',
    icon: EnvelopeIcon,
    action: 'mailto:info@julianinteriors.com',
    badge: 'Quick Response',
  },
  {
    title: 'Visit',
    value: 'Nairobi, Kenya',
    note: 'Showroom visits by appointment',
    icon: MapPinIcon,
    action: 'https://maps.google.com',
    badge: 'Book Appointment',
  },
]

const faqs = [
  {
    question: 'How quickly can you start a project?',
    answer: 'We typically begin projects within 2-4 weeks after consultation and design approval.',
  },
  {
    question: 'Do you offer free consultations?',
    answer: 'Yes, we offer an initial 30-minute consultation to discuss your project goals.',
  },
  {
    question: 'What areas do you serve?',
    answer: 'We primarily serve Nairobi and surrounding areas, with select projects nationwide.',
  },
  {
    question: 'Can I visit your showroom?',
    answer: 'Yes, we welcome visits by appointment to ensure personalized attention.',
  },
]

const officeHours = [
  { day: 'Monday - Friday', hours: '8:00 AM - 6:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
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

const ContactPage = () => {
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
        
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-white/80 backdrop-blur-sm p-8 shadow-xl sm:p-10"
          >
            {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-secondary/5 blur-3xl" />
            
            <div className="relative">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-lg"
              >
                <SparklesIcon className="h-4 w-4" />
                Contact Julian Interiors
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-4xl font-bold text-text sm:text-5xl lg:text-6xl"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                Let's plan your{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  next interior project
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-3 max-w-3xl text-lg leading-relaxed text-text-secondary"
              >
                Share your goals, space type, and timeline. We'll guide you on the best approach for
                design, installation, finishing, and project delivery.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-5 flex flex-wrap gap-3"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 text-sm text-text-secondary border border-border">
                  <ClockIcon className="h-4 w-4 text-primary" />
                  Quick response within 24 hours
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 text-sm text-text-secondary border border-border">
                  <MapPinIcon className="h-4 w-4 text-primary" />
                  Nairobi-based service team
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 text-sm text-text-secondary border border-border">
                  <CheckBadgeIcon className="h-4 w-4 text-primary" />
                  Free consultation
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Main Content Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Contact Form */}
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="relative"
          >
            <div className="sticky top-24">
              <div className="rounded-3xl border border-border bg-white p-6 shadow-xl sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                    <ChatBubbleLeftIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-text">Send us a message</h2>
                    <p className="text-sm text-text-secondary mt-1">
                      Fill in the form and our team will reach out with recommendations
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <ContactForm />
                </div>

                {/* Trust Badge */}
                <div className="mt-6 flex items-center gap-2 text-sm text-text-tertiary border-t border-border pt-4">
                  <CheckBadgeIcon className="h-4 w-4 text-primary" />
                  <span>All inquiries are responded to within 24 hours</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Contact Cards & Map */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Contact Cards */}
            <div className="grid gap-4">
              {contactCards.map((item, index) => {
                const Icon = item.icon
                return (
                  <motion.a
                    key={item.title}
                    href={item.action}
                    variants={fadeInUp}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-lg hover:shadow-xl transition-all"
                    target={item.title === 'Visit' ? '_blank' : undefined}
                    rel={item.title === 'Visit' ? 'noopener noreferrer' : undefined}
                  >
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
                            {item.title}
                          </h3>
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-text group-hover:text-primary transition-colors">
                          {item.value}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {item.note}
                        </p>
                      </div>
                      
                      <ArrowRightIcon className="h-5 w-5 text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.a>
                )
              })}
            </div>

            {/* Office Hours Card */}
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <ClockIcon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-text">Office Hours</h3>
              </div>
              
              <div className="space-y-2">
                {officeHours.map((schedule) => (
                  <div key={schedule.day} className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">{schedule.day}</span>
                    <span className="font-medium text-text">{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Map */}
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl overflow-hidden border border-border shadow-lg h-[250px] relative group"
            >
              <Map />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-text shadow-lg">
                <MapPinIcon className="h-3 w-3 inline mr-1 text-primary" />
                Nairobi, Kenya
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={fadeInUp}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-border shadow-lg"
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-primary" />
                <span className="text-sm text-text-secondary">Join our community</span>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-white"
                  />
                ))}
                <div className="w-8 h-8 rounded-full bg-background border-2 border-white flex items-center justify-center text-xs font-bold text-primary">
                  +50
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-white p-8 shadow-xl"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                FAQ
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-5 rounded-xl bg-background hover:bg-gradient-to-br hover:from-primary/5 hover:to-secondary/5 transition-all cursor-default"
              >
                <h3 className="font-semibold text-text group-hover:text-primary transition-colors">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-primary to-secondary p-8 shadow-xl"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Need ideas first?</h2>
              <p className="mt-2 text-white/90 max-w-xl">
                Explore our project showcase and service options before booking your consultation.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Link to="/projects">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg hover:shadow-xl transition-all"
                >
                  View Projects
                  <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link to="/services">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white border border-white/30 hover:bg-white/30 transition-all"
                >
                  Browse Services
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Business Info Bar */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BuildingOfficeIcon, label: 'Established', value: '2019' },
            { icon: UserGroupIcon, label: 'Team Members', value: '15+' },
            { icon: HeartIcon, label: 'Happy Clients', value: '200+' },
            { icon: GlobeAltIcon, label: 'Service Area', value: 'Nationwide' },
          ].map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-4 bg-white rounded-xl border border-border shadow-lg"
              >
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-xl font-bold text-text">{item.value}</p>
                <p className="text-xs text-text-tertiary mt-1">{item.label}</p>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default ContactPage