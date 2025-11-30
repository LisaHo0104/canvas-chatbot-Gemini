import { UpdatePasswordForm } from '@/components/update-password-form'
import { AuthShell } from '@/components/auth/AuthShell'

export default function Page() {
  return (
    <AuthShell>
      <UpdatePasswordForm className="w-full max-w-lg" />
    </AuthShell>
  )
}
