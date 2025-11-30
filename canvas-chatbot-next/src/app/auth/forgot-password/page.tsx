import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { AuthShell } from '@/components/auth/AuthShell'

export default function Page() {
  return (
    <AuthShell imageSrc="/dog_mail.png" imageAlt="Forgot password illustration">
      <ForgotPasswordForm className="w-full max-w-lg" />
    </AuthShell>
  )
}
