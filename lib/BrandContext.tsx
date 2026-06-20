'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Brand = {
  company_name: string
  domain: string | null
  display_name: string
  logo_url: string | null
  primary_color: string
  primary_color_light: string | null
  primary_color_dark: string | null
  background_color: string
  text_color: string
  favicon_url: string | null
  email_from_name: string
}

const DEFAULT_BRAND: Brand = {
  company_name: 'InventoryTools',
  domain: 'inventorytools.co.uk',
  display_name: 'InventoryTools',
  logo_url: '/logo.png',
  primary_color: '#FD6A02',
  primary_color_light: '#fff0e6',
  primary_color_dark: '#c24a00',
  background_color: '#F7F9F8',
  text_color: '#1A2820',
  favicon_url: null,
  email_from_name: 'InventoryTools',
}

const CACHE_KEY = 'cachedBrand'
const CACHE_TIME_KEY = 'cachedBrandTime'
const FRESH_WINDOW_MS = 15000

function getCachedBrand(): Brand | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached) as Brand
  } catch (e) { /* ignore */ }
  return null
}

function isCacheFresh(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const t = sessionStorage.getItem(CACHE_TIME_KEY)
    if (!t) return false
    return (Date.now() - parseInt(t, 10)) < FRESH_WINDOW_MS
  } catch (e) { return false }
}

const BrandContext = createContext<Brand>(DEFAULT_BRAND)

export function useBrand() {
  return useContext(BrandContext)
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand | null>(getCachedBrand)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Have a cached value already - show it immediately, no loading screen needed
    if (brand) {
      setReady(true)
      if (isCacheFresh()) return // trust it, skip re-fetch entirely
    }

    async function resolveBrand() {
      let resolved: Brand = DEFAULT_BRAND

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', session.user.id)
          .single()

        if (profile?.company_name) {
          const { data: brandRow } = await supabase
            .from('brands')
            .select('*')
            .eq('company_name', profile.company_name)
            .maybeSingle()

          if (brandRow) resolved = brandRow as Brand
        }
      } else if (typeof window !== 'undefined') {
        const hostname = window.location.hostname.replace('www.', '')
        const { data: brandRow } = await supabase
          .from('brands')
          .select('*')
          .eq('domain', hostname)
          .maybeSingle()

        if (brandRow) resolved = brandRow as Brand
      }

      setBrand(resolved)
      setReady(true)
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(resolved))
        sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
      } catch (e) { /* ignore */ }
    }

    resolveBrand()
  }, [])

  if (!ready) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e0e0e0', borderTopColor: '#999', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <BrandContext.Provider value={brand || DEFAULT_BRAND}>{children}</BrandContext.Provider>
}
