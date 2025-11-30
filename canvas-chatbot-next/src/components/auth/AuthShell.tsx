import Image from 'next/image'
import React from 'react'

export function AuthShell({
  children,
  imageSrc = '/dog_auth_login.png',
  imageAlt = 'Authentication illustration',
}: {
  children: React.ReactNode
  imageSrc?: string
  imageAlt?: string
}) {
  return (
    <div className="min-h-svh w-full p-6 flex items-center justify-center">
      <div className="flex flex-col md:grid md:grid-cols-2 items-center">
        <div className="flex items-center justify-center mb-6 md:mb-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={480}
            height={480}
            priority
            className="h-auto w-full max-w-[280px] md:max-w-[480px]"
          />
        </div>
        <div className="flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
