import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type FaqItem = {
  id: string
  category: 'General' | 'Projects' | 'Design' | 'Pricing' | 'Support'
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    id: 'consultation-time',
    category: 'General',
    question: 'How do I book a consultation with Julian Interiors?',
    answer:
      'You can submit the contact form, call our team, or message us on WhatsApp. We confirm your consultation time within one business day.',
  },
  {
    id: 'service-areas',
    category: 'General',
    question: 'Which locations do you currently serve?',
    answer:
      'We primarily serve Nairobi and nearby counties. For larger projects, we also support selected nationwide installations.',
  },
  {
    id: 'project-start',
    category: 'Projects',
    question: 'How soon can my project start after approval?',
    answer:
      'Most projects start within 1 to 3 weeks depending on design complexity, material lead time, and team scheduling.',
  },
  {
    id: 'project-duration',
    category: 'Projects',
    question: 'How long does a typical interior project take?',
    answer:
      'Small upgrades can take a few days, while full space transformations usually take 3 to 8 weeks with clear milestone updates.',
  },
  {
    id: 'custom-design',
    category: 'Design',
    question: 'Do you create custom concepts for each client?',
    answer:
      'Yes. Every proposal is tailored to your layout, lifestyle, and budget. We provide mood direction, material options, and practical implementation guidance.',
  },
  {
    id: 'visual-preview',
    category: 'Design',
    question: 'Can I preview ideas before implementation?',
    answer:
      'Yes. We provide visual references and concept direction so you can make confident decisions before execution begins.',
  },
  {
    id: 'pricing-model',
    category: 'Pricing',
    question: 'How is pricing structured?',
    answer:
      'Pricing depends on scope, material quality, and timeline. After consultation, we share a detailed quotation with transparent line items.',
  },
  {
    id: 'payment-terms',
    category: 'Pricing',
    question: 'Do you allow staged payments?',
    answer:
      'Yes. Most projects follow milestone-based payments: deposit, progress stage(s), and final handover balance.',
  },
  {
    id: 'after-handover',
    category: 'Support',
    question: 'Do you offer support after project handover?',
    answer:
      'Yes. We provide post-installation support and maintenance guidance to keep your space looking and performing at its best.',
  },
  {
    id: 'changes-during-project',
    category: 'Support',
    question: 'What if I request changes during execution?',
    answer:
      'Change requests are reviewed quickly for timeline and cost impact, then confirmed before any adjustment is applied.',
  },
]

const categories = ['All', 'General', 'Projects', 'Design', 'Pricing', 'Support'] as const

type CategoryFilter = (typeof categories)[number]

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All')
  const [openFaqId, setOpenFaqId] = useState<string>(faqItems[0]?.id ?? '')

  const filteredFaqs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return faqItems.filter((item) => {
      const categoryMatches = activeCategory === 'All' || item.category === activeCategory
      const textMatches =
        query.length === 0 ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)

      return categoryMatches && textMatches
    })
  }, [activeCategory, searchTerm])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-white to-background">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-36 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-36 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <section className="pt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-border bg-white/85 p-8 shadow-xl backdrop-blur-sm sm:p-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <SparklesIcon className="h-4 w-4" />
              Frequently Asked Questions
            </div>

            <h1
              className="mt-4 text-4xl font-bold text-text sm:text-5xl"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Answers to help you plan your
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> ideal space</span>
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Explore quick answers about consultations, project timelines, pricing, design process, and post-handover support.
            </p>

            <div className="mt-6 relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search question or keyword..."
                className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = activeCategory === category

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'border-primary bg-primary text-white shadow-md'
                        : 'border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="space-y-4"
          >
            {filteredFaqs.length === 0 && (
              <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-text-secondary">No results found for your search. Try another keyword or category.</p>
              </div>
            )}

            {filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id

              return (
                <article key={faq.id} className="rounded-2xl border border-border bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <div>
                      <span className="inline-flex rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {faq.category}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-text sm:text-lg">{faq.question}</h3>
                    </div>
                    <ChevronDownIcon
                      className={`h-5 w-5 shrink-0 text-text-tertiary transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border px-5 pb-5 pt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              )
            })}
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="space-y-4 lg:sticky lg:top-24 lg:self-start"
          >
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-xl bg-primary/10 p-2">
                <QuestionMarkCircleIcon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-3 text-xl font-semibold text-text">Need a custom answer?</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                If your question is project-specific, our team can guide you with a tailored recommendation.
              </p>
              <Link
                to="/contact"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5"
              >
                Contact Us
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="inline-flex rounded-xl bg-secondary/10 p-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-text">Helpful next steps</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Link to="/services" className="block rounded-lg bg-background px-3 py-2 text-text-secondary transition-colors hover:text-primary">
                  Explore our service packages
                </Link>
                <Link to="/projects" className="block rounded-lg bg-background px-3 py-2 text-text-secondary transition-colors hover:text-primary">
                  View completed project work
                </Link>
                <Link to="/gallery" className="block rounded-lg bg-background px-3 py-2 text-text-secondary transition-colors hover:text-primary">
                  Browse inspiration gallery
                </Link>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>
    </div>
  )
}

export default FAQPage
