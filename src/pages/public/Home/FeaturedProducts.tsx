export const FeaturedProducts = () => {
  // Placeholder content – later wire to real products
  const items = [
    'Smartphones & accessories',
    'Fashion essentials',
    'Home & kitchen picks',
    'Beauty & personal care'
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Featured products
          </h2>
          <p className="text-xs text-text-tertiary">
            Handpicked pieces your customers are already loving.
          </p>
        </div>
        <a
          href="/products"
          className="text-xs font-medium text-primary hover:text-primary-dark"
        >
          View all
        </a>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {items.map((name) => (
          <article
            key={name}
            className="rounded-xl border border-border bg-surface p-3 text-xs text-text-secondary shadow-sm"
          >
            <div className="mb-2 h-24 rounded-lg bg-secondary-light" />
            <h3 className="text-sm font-semibold text-text">{name}</h3>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Great value from trusted MtaaMall sellers.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default FeaturedProducts
