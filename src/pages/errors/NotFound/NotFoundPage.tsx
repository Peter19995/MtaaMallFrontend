import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-tertiary">Error</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        404 – Page not found
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-text-tertiary">
        The page you’re looking for doesn’t exist. It may have been moved or renamed inside the
        MtaaMall suite.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:bg-primary-dark"
        >
          Back to home
        </Link>
        <Link
          to="/dashboard/admin"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-secondary hover:border-primary-light hover:text-primary-dark"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage

