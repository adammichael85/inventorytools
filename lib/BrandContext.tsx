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

function getCachedBrand(): Brand {
  if (typeof window === 'undefined') return DEFAULT_BRAND
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached) as Brand
  } catch (e) { /* ignore parse errors */ }
  return DEFAULT_BRAND
}

const BrandContext = createContext<Brand>(DEFAULT_BRAND)

export function useBrand() {
  return useContext(BrandContext)
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cache synchronously - no flash of wrong brand on repeat visits
  const [brand, setBrand] = useState<Brand>(getCachedBrand)

  useEffect(() => {
    async function resolveBrand() {
      let resolved: Brand = DEFAULT_BRAND

      // 1. Check if logged in - account-based branding takes priority
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
        // 2. Not logged in - fall back to domain-based lookup
        const hostname = window.location.hostname.replace('www.', '')
        const { data: brandRow } = await supabase
          .from('brands')
          .select('*')
          .eq('domain', hostname)
          .maybeSingle()

        if (brandRow) resolved = brandRow as Brand
      }

      setBrand(resolved)
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(resolved))
      } catch (e) { /* ignore storage errors */ }
    }

    resolveBrand()
  }, [])

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}
