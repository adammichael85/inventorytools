'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const T = '#FD6A02'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    if (password.length < 6) { setMessage('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setMessage(error.message) } else { setDone(true) }
    setLoading(false)
  }

  const input = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e8e8e8', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: T, borderRadius: 12, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="26" fill="rgba(255,255,255,0.2)"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Set new password</h1>
        </div>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', marginBottom: 20 }}>Your password has been updated successfully!</p>
            <a href="/auth" style={{ display: 'inline-block', background: T, color: '#fff', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={input} />
            </div>
            {message && <p style={{ fontSize: 13, color: message.includes('sent') ? '#16a34a' : '#DC2626', marginBottom: 12 }}>{message}</p>}
            <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: T, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
