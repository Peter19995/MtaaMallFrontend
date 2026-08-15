export const ServicesSection = () => {
  const services = [
    {
      title: 'Reliable delivery',
      description: 'Convenient fulfilment and clear order updates from checkout to your doorstep.'
    },
    {
      title: 'Secure payments',
      description: 'Pay confidently using familiar and convenient payment options, including M-Pesa.'
    },
    {
      title: 'Seller support',
      description: 'Tools that help local businesses showcase products, manage orders, and grow.'
    }
  ]

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <header className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Services
        </h2>
        <p className="text-xs text-text-tertiary">
          Everything shoppers and sellers need for a smooth marketplace experience.
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
