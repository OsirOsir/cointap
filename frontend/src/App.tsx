import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/cointap/AppLayout'
import { MaintenanceBanner } from '@/components/cointap/MaintenanceBanner'
import { ChatWidget } from '@/components/cointap/ChatWidget'
import { InstallPrompt, UpdatePrompt } from '@/components/cointap/PwaPrompts'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { Dashboard } from '@/pages/Dashboard'
import { Wallet } from '@/pages/Wallet'
import { Plans } from '@/pages/Plans'
import { Orders } from '@/pages/Orders'
import { Referrals } from '@/pages/Referrals'
import { Withdraw } from '@/pages/Withdraw'
import { Admin } from '@/pages/Admin'
import { Profile } from '@/pages/Profile'
import { VerifyEmail } from '@/pages/VerifyEmail'
import { Apply } from '@/pages/Apply'
import { Privacy } from '@/pages/Privacy'
import { Terms } from '@/pages/Terms'
import { store } from '@/lib/cointap-store'

export default function App() {
  const [restoring, setRestoring] = useState(true)

  // Restore session from stored JWT on first load
  useEffect(() => {
    store.apiRestoreSession().finally(() => setRestoring(false))
  }, [])

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <MaintenanceBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/admin" element={<Admin />} />
        {/* Careers — public, mobile-first form. /careers redirects to /apply. */}
        <Route path="/apply" element={<Apply />} />
        <Route path="/careers" element={<Navigate to="/apply" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Protected (layout with sidebar) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
      <InstallPrompt />
      <UpdatePrompt />
    </BrowserRouter>
  )
}
