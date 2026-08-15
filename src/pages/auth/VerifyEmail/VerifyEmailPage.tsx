const VerifyEmailPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-divider/60">
        <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-xs text-text-secondary">
          We&apos;ve sent a verification link to your email. Once confirmed, your account will be
          ready to use.
        </p>
      </div>
    </div>
  )
}

export default VerifyEmailPage

