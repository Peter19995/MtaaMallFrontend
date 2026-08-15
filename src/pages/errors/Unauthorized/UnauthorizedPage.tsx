const UnauthorizedPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
      <p className="mt-2 max-w-md text-center text-sm text-text-secondary">
        You don&apos;t have permission to view this area. If you believe this is a mistake, please
        contact your administrator.
      </p>
    </div>
  )
}

export default UnauthorizedPage

