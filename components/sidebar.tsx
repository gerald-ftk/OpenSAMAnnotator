'use client'

import { cn } from '@/lib/utils'
import { VisosLogo } from "@/components/ui/visos-logo"
import { Settings, Layers } from 'lucide-react'
import type { ViewType, Dataset } from '@/app/page'

interface SidebarProps {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  selectedDataset: Dataset | null
}

type NavItem = { id: ViewType; label: string; key: string }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: 'Data',
    items: [
      { id: 'datasets',  label: 'Datasets',      key: '01' },
      { id: 'dashboard', label: 'Dashboard',      key: '02' },
      { id: 'gallery',   label: 'Gallery',        key: '03' },
      { id: 'sorting',   label: 'Sort & Filter',  key: '04' },
      { id: 'duplicate-detection', label: 'Duplicates', key: '04b' },
    ],
  },
  {
    label: 'Annotate',
    items: [
      { id: 'annotate', label: 'Annotate', key: '05' },
      { id: 'classes',  label: 'Classes',  key: '06' },
    ],
  },
  {
    label: 'Process',
    items: [
      { id: 'augmentation',     label: 'Augmentation',   key: '07' },
      { id: 'video-extraction', label: 'Video Frames',   key: '08' },
      { id: 'split',            label: 'Train/Val/Test', key: '09' },
      { id: 'convert',          label: 'Convert',        key: '10' },
      { id: 'merge',            label: 'Merge',          key: '11' },
      { id: 'yaml-wizard',      label: 'YAML Wizard',    key: '12' },
    ],
  },
  {
    label: 'Train',
    items: [
      { id: 'training', label: 'Training', key: '13' },
      { id: 'models',   label: 'Models',   key: '14' },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { id: 'health',    label: 'Health Check', key: '15' },
      { id: 'compare',   label: 'Compare',      key: '16' },
      { id: 'snapshots', label: 'Snapshots',    key: '17' },
    ],
  },
]

export function Sidebar({ activeView, setActiveView, selectedDataset }: SidebarProps) {
  return (
    <aside className="relative w-52 h-full flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden select-none shrink-0">

      {/* Ambient glow */}
      <div className="ambient-orb w-48 h-48 bg-primary -top-16 -left-16 absolute" />

      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className="relative px-4 pt-5 pb-4">
        <VisosLogo size={120} showText={true} />
      </div>

      {/* ── Active dataset pill ─────────────────────────────────────────── */}
      {selectedDataset && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg border border-primary/15 bg-primary/5">
          <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-primary/50 mb-1">
            Active
          </p>
          <p className="text-xs font-medium text-sidebar-foreground truncate leading-tight">
            {selectedDataset.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono tracking-wider border border-primary/15">
              {selectedDataset.format?.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">
              {selectedDataset.num_images?.toLocaleString()} img
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px mx-3 bg-sidebar-border mb-3" />

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[9px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground/40">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => {
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      'group relative w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-left',
                      'transition-all duration-150',
                      isActive
                        ? 'bg-primary/8 text-primary'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    {/* Active indicator stripe */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                    )}
                    {/* Monospace index */}
                    <span className={cn(
                      'text-[9px] font-mono w-5 shrink-0 transition-colors',
                      isActive ? 'text-primary/60' : 'text-muted-foreground/30 group-hover:text-muted-foreground/50'
                    )}>
                      {item.key}
                    </span>
                    <span className={cn(
                      'text-xs transition-colors tracking-tight',
                      isActive ? 'font-semibold' : 'font-medium'
                    )}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="px-2 py-2 border-t border-sidebar-border">
        <button
          onClick={() => setActiveView('settings')}
          className={cn(
            'group relative w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-left',
            'transition-all duration-150',
            activeView === 'settings'
              ? 'bg-primary/8 text-primary'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          {activeView === 'settings' && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
          )}
          <span className={cn(
            'text-[9px] font-mono w-5 shrink-0',
            activeView === 'settings' ? 'text-primary/60' : 'text-muted-foreground/30 group-hover:text-muted-foreground/50'
          )}>
            —
          </span>
          <span className={cn('text-xs tracking-tight', activeView === 'settings' ? 'font-semibold' : 'font-medium')}>
            Settings
          </span>
          <Settings
            className={cn(
              'w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-40 transition-opacity',
              activeView === 'settings' && 'opacity-40'
            )}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </aside>
  )
}
