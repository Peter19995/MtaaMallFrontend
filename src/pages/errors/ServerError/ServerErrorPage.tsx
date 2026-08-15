const ServerErrorPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
        An unexpected error occurred. Please try again in a moment or contact support if the issue
        persists.
      </p>
    </div>
  )
}

export default ServerErrorPage

