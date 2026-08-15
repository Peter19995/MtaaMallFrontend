export const ServicesSection = () => {
  const services = [
    {
      title: 'Curtain installation',
      description: 'Precise measurements, professional fitting and finishing for every window.'
    },
    {
      title: 'Interior styling',
      description: 'Room-by-room curation of fabrics, decor and layout to match your brand.'
    },
    {
      title: 'Post-construction cleaning',
      description: 'Deep cleaning and detailing to make new spaces move-in ready.'
    }
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Services
        </h2>
        <p className="text-xs text-text-tertiary">
          Track every service request from inquiry to completion in a single system.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.title}
            className="rounded-xl border border-border bg-surface p-4 text-xs text-text-secondary shadow-sm"
          >
            <h3 className="text-sm font-semibold text-text">{service.title}</h3>
            <p className="mt-2 text-[11px] text-text-tertiary">{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ServicesSection

