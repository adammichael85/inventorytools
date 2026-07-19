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
  const cachedAtStart = getCachedBrand()
  // Trust any cached brand immediately, regardless of age - this is what's shown instantly on
  // every refresh, with zero flash of default colors. We still silently re-validate in the
  // background below, but never block or revert to default while that happens.
  const [brand, setBrand] = useState<Brand>(cachedAtStart || DEFAULT_BRAND)
  const [ready, setReady] = useState<boolean>(!!cachedAtStart)

  // NOTE: the brief-flash masking overlay that used to sit here has been removed - it was
  // causing the entire dashboard to stay permanently hidden behind a grey blur for some
  // accounts (never lifting), which is a far worse outcome than the flash it was meant to
  // hide. Removed entirely rather than patched again, to stop production being broken while
  // a proper fix is worked out separately and tested properly before reintroducing it.

  useEffect(() => {
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

      if (typeof document !== 'undefined' && resolved.display_name) {
        document.title = resolved.display_name
      }

      if (resolved.favicon_url && typeof document !== 'undefined') {
        const existingIcons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
        existingIcons.forEach(el => el.remove())
        const iconLink = document.createElement('link')
        iconLink.rel = 'icon'
        iconLink.type = 'image/png'
        iconLink.href = resolved.favicon_url
        document.head.appendChild(iconLink)
        const shortcutLink = document.createElement('link')
        shortcutLink.rel = 'shortcut icon'
        shortcutLink.type = 'image/png'
        shortcutLink.href = resolved.favicon_url
        document.head.appendChild(shortcutLink)
      }
    }

    resolveBrand()
  }, [])

  // Apply cached title immediately too, for instant correctness on repeat visits
  useEffect(() => {
    if (cachedAtStart?.display_name && typeof document !== 'undefined') {
      document.title = cachedAtStart.display_name
    }
  }, [])

  // Apply cached favicon immediately too, for instant correctness on repeat visits
  useEffect(() => {
    if (cachedAtStart?.favicon_url && typeof document !== 'undefined') {
      const existingIcons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      existingIcons.forEach(el => el.remove())
      const iconLink = document.createElement('link')
      iconLink.rel = 'icon'
      iconLink.type = 'image/png'
      iconLink.href = cachedAtStart.favicon_url
      document.head.appendChild(iconLink)
      const shortcutLink = document.createElement('link')
      shortcutLink.rel = 'shortcut icon'
      shortcutLink.type = 'image/png'
      shortcutLink.href = cachedAtStart.favicon_url
      document.head.appendChild(shortcutLink)
    }
  }, [])

  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  )
}
