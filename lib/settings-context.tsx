'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'

export interface AppSettings {
  apiUrl: string
  modelsPath: string
  datasetsPath: string
  outputPath: string
  useGpu: boolean
  gpuDevice: string
  darkMode: boolean
  autoSave: boolean
  notifications: boolean
}

const DEFAULTS: AppSettings = {
  apiUrl: 'http://localhost:8000',
  modelsPath: '/models',
  datasetsPath: '/datasets',
  outputPath: '/output',
  useGpu: true,
  gpuDevice: '0',
  darkMode: true,
  autoSave: true,
  notifications: true,
}

const STORAGE_KEY = 'cv-dataset-manager-settings'

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  saveSettings: (patch?: Partial<AppSettings>) => Promise<void>
  isSaving: boolean
  lastSaved: Date | null
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function loadFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function persistToStorage(s: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // storage quota or SSR — ignore
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const { setTheme } = useTheme()

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    setSettings(stored)
    setTheme(stored.darkMode ? 'dark' : 'light')
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      persistToStorage(next)
      return next
    })
    // Apply dark mode immediately when toggled
    if ('darkMode' in patch) {
      setTheme(patch.darkMode ? 'dark' : 'light')
    }
  }, [setTheme])

  /**
   * Persist settings to localStorage AND push to the backend API.
   * Accepts an optional patch so the caller can do one combined update+save.
   */
  const saveSettings = useCallback(async (patch?: Partial<AppSettings>) => {
    setIsSaving(true)
    const next = patch ? { ...settings, ...patch } : settings
    if (patch) {
      setSettings(next)
      if ('darkMode' in patch) setTheme(patch.darkMode ? 'dark' : 'light')
    }
    persistToStorage(next)

    try {
      await fetch(`${next.apiUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models_path: next.modelsPath,
          datasets_path: next.datasetsPath,
          output_path: next.outputPath,
          use_gpu: next.useGpu,
          gpu_device: next.gpuDevice,
        }),
        signal: AbortSignal.timeout(4000),
      })
    } catch {
      // Backend may be offline — settings are still saved locally, that's fine
    }

    setLastSaved(new Date())
    setIsSaving(false)
  }, [settings, setTheme])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, isSaving, lastSaved }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
