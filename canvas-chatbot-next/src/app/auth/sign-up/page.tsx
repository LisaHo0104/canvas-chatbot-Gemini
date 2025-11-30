import { SignUpForm } from '@/components/sign-up-form'
import { AuthShell } from '@/components/auth/AuthShell'

export default function Page() {
  return (
    <AuthShell>
      <SignUpForm className="w-full max-w-lg" />
    </AuthShell>
  )
}
