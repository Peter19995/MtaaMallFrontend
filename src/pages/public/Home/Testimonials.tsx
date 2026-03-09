export const Testimonials = () => {
  const testimonials = [
    {
      name: 'Residential client',
      quote:
        'Julian Interiors transformed our living room – the curtains and decor look like a magazine spread.',
    },
    {
      name: 'Property developer',
      quote:
        'Their team handled installation and post-construction cleaning across multiple units seamlessly.',
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Testimonials
        </h2>
        <p className="text-xs text-text-tertiary">
          Build trust by pairing a polished online experience with reliable delivery on site.
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

