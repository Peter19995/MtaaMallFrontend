import { motion } from 'framer-motion'
import { ColorMatcher } from '@components/features/styling/ColorMatcher'

export const StylingStudioPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ColorMatcher />
        </motion.div>
      </div>
    </div>
  )
}

export default StylingStudioPage
