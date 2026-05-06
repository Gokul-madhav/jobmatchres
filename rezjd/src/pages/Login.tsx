import React from 'react'
import { AuthForm } from '../components/AuthForm'
import { PageWrapper } from '../components/layout/PageWrapper'

export default function Login() {
  return (
    <PageWrapper narrow className="flex items-center justify-center">
      <AuthForm mode="login" />
    </PageWrapper>
  )
}
