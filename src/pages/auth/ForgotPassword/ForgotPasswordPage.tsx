const ForgotPasswordPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-divider/60">
        <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-xs text-text-secondary">
          Enter your email address and we&apos;ll send you a secure link to set a new password.
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordPage

