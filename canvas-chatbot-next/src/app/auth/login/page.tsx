import { LoginForm } from '@/components/login-form'
import { AuthShell } from '@/components/auth/AuthShell'

export default function Page() {
  return (
    <AuthShell>
      <LoginForm className="w-full max-w-lg" />
    </AuthShell>
  )
}
