const SalesOperationsPage = () => {
  return (
    <div className="space-y-4 text-text">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Sales operations</h1>
      <p className="text-sm text-text-secondary">
        Admin access is enabled for sales operations. This section is ready for full sales and POS
        workflow wiring.
      </p>
      <div className="rounded-xl border border-border bg-surface p-4 text-xs text-text-tertiary">
        Next integration targets: cart, checkout, orders, POS sales, and reporting endpoints.
      </div>
    </div>
  )
}

export default SalesOperationsPage
