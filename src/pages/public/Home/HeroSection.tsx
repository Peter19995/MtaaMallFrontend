export const HeroSection = () => {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center">
      <div className="flex-1 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Kenya's Online Marketplace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl md:text-5xl">
          Shop your favourites.
          <br />
          <span className="text-primary">Delivered closer to home.</span>
        </h1>
        <p className="max-w-xl text-sm text-text-secondary sm:text-base">
          Discover everyday essentials, fashion, electronics, home products, and more from trusted
          sellers, with convenient payments and dependable delivery.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/login"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:bg-primary-dark"
          >
            Start shopping
          </a>
          <a
            href="/products"
            className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-primary-light hover:text-primary-dark"
          >
            Browse all products
          </a>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
