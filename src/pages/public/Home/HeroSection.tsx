export const HeroSection = () => {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center">
      <div className="flex-1 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Julian Interiors Management Suite
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl md:text-5xl">
          Design stunning spaces.
          <br />
          <span className="text-primary">Run a smarter business.</span>
        </h1>
        <p className="max-w-xl text-sm text-text-secondary sm:text-base">
          From e-commerce to project tracking, POS, inventory and AI insights – everything you need
          to manage Julian Interiors in one beautiful, intuitive workspace.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/login"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:bg-primary-dark"
          >
            Enter operations dashboard
          </a>
          <a
            href="/products"
            className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-primary-light hover:text-primary-dark"
          >
            Shop curtains & décor
          </a>
        </div>
      </div>
    </section>
  )
}

export default HeroSection

