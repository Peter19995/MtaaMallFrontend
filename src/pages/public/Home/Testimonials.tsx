export const Testimonials = () => {
  const testimonials = [
    {
      name: 'Verified shopper',
      quote:
        'MtaaMall made it easy to compare products, pay securely, and get my order delivered on time.',
    },
    {
      name: 'Local business owner',
      quote:
        'I can reach more customers while managing products and orders from one convenient platform.',
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Testimonials
        </h2>
        <p className="text-xs text-text-tertiary">
          Real experiences from shoppers and sellers growing with MtaaMall.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {testimonials.map((item) => (
          <figure
            key={item.name}
            className="rounded-xl border border-border bg-surface p-4 text-xs text-text-secondary shadow-sm"
          >
            <blockquote className="text-[11px] text-text-tertiary">&ldquo;{item.quote}&rdquo;</blockquote>
            <figcaption className="mt-3 text-xs font-medium text-text">{item.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export default Testimonials
