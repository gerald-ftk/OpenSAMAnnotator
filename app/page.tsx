'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { DatasetsView } from '@/components/datasets-view'
import { DashboardView } from '@/components/dashboard-view'
import { GalleryView } from '@/components/gallery-view'
import { SortingView } from '@/components/sorting-view'
import { AnnotationView } from '@/components/annotation-view'
import { ConvertView } from '@/components/convert-view'
import { MergeView } from '@/components/merge-view'
import { TrainingView } from '@/components/training-view'
import { ModelsView } from '@/components/models-view'
import { SettingsView } from '@/components/settings-view'
import { ClassManagementView } from '@/components/class-management-view'
import { AugmentationView } from '@/components/augmentation-view'
import { VideoExtractionView } from '@/components/video-extraction-view'
import { SplitView } from '@/components/split-view'
import { HealthView } from '@/components/health-view'
import { CompareView } from '@/components/compare-view'
import { SnapshotView } from '@/components/snapshot-view'
import { YamlWizardView } from '@/components/yaml-wizard-view'
import { DuplicateDetectionView } from '@/components/duplicate-detection-view'
import { useSettings } from '@/lib/settings-context'

export type ViewType = 'datasets' | 'dashboard' | 'gallery' | 'sorting' | 'annotate' | 'classes' | 'augmentation' | 'video-extraction' | 'split' | 'convert' | 'merge' | 'training' | 'models' | 'health' | 'compare' | 'snapshots' | 'yaml-wizard' | 'settings' | 'duplicate-detection'

export interface Dataset {
  id: string
  name: string
  path: string
  format: string
  task_type: string
  num_images: number
  num_annotations: number
  classes: string[]
  created_at: string
}

export interface ImageData {
  id: string
  filename: string
  path: string
  width?: number
  height?: number
  split?: string
  class_name?: string
  annotations: Annotation[]
  has_annotations: boolean
}

export interface Annotation {
  id?: string
  type: string
  class_id: number
  class_name: string
  bbox?: number[]
  x_center?: number
  y_center?: number
  width?: number
  height?: number
  points?: number[]
  normalized?: boolean
}

// Shared image cache so tab-switches don't reload
export type ImageCache = Record<string, ImageData[]>

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>('datasets')
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [imageCache, setImageCache] = useState<ImageCache>({})
  const [annotateInitialImageId, setAnnotateInitialImageId] = useState<string | null>(null)
  const [gpuStatus, setGpuStatus] = useState<{ state: string; message: string } | null>(null)

  // apiUrl now comes from the shared settings context
  const { settings } = useSettings()
  const apiUrl = settings.apiUrl

  // Poll GPU/CUDA install status every 4 s — hide banner once state is "ready"
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const check = async () => {
      try {
        const r = await fetch(`${apiUrl}/api/device-info`)
        if (r.ok) {
          const d = await r.json()
          const s = d.gpu_status
          if (s && s.state !== 'ready' && s.state !== 'no_gpu' && s.state !== 'unknown') {
            setGpuStatus(s)
          } else {
            setGpuStatus(null)
          }
          // Stop polling once ready or no GPU
          if (s?.state === 'ready' || s?.state === 'no_gpu') return
        }
      } catch { /* backend may be restarting */ }
      timer = setTimeout(check, 4000)
    }
    timer = setTimeout(check, 3000)
    return () => clearTimeout(timer)
  }, [apiUrl])

  const updateImageCache = useCallback((datasetId: string, images: ImageData[]) => {
    setImageCache(prev => ({ ...prev, [datasetId]: images }))
  }, [])

  const invalidateImageCache = useCallback((datasetId: string) => {
    setImageCache(prev => {
      const next = { ...prev }
      delete next[datasetId]
      return next
    })
  }, [])

  const handleSelectDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset)
  }

  const renderView = () => {
    switch (activeView) {
      case 'datasets':
        return (
          <DatasetsView
            datasets={datasets}
            setDatasets={setDatasets}
            selectedDataset={selectedDataset}
            onSelectDataset={handleSelectDataset}
            onDatasetLoaded={invalidateImageCache}
            apiUrl={apiUrl}
          />
        )
      case 'dashboard':
        return (
          <DashboardView
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={handleSelectDataset}
            setActiveView={setActiveView}
            apiUrl={apiUrl}
          />
        )
      case 'gallery':
        return (
          <GalleryView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
            imageCache={imageCache}
            updateImageCache={updateImageCache}
            onOpenAnnotator={(imageId: string) => { setAnnotateInitialImageId(imageId); setActiveView('annotate') }}
          />
        )
      case 'health':
        return (
          <HealthView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
            imageCache={imageCache}
            updateImageCache={updateImageCache}
          />
        )
      case 'compare':
        return (
          <CompareView
            datasets={datasets}
            apiUrl={apiUrl}
          />
        )
      case 'snapshots':
        return (
          <SnapshotView
            selectedDataset={selectedDataset}
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'sorting':
        return (
          <SortingView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
            imageCache={imageCache}
            updateImageCache={updateImageCache}
          />
        )
      case 'duplicate-detection':
        return (
          <DuplicateDetectionView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
          />
        )
      case 'annotate':
        return (
          <AnnotationView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
            imageCache={imageCache}
            updateImageCache={updateImageCache}
            initialImageId={annotateInitialImageId}
            onInitialImageConsumed={() => setAnnotateInitialImageId(null)}
          />
        )
      case 'classes':
        return (
          <ClassManagementView
            selectedDataset={selectedDataset}
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'augmentation':
        return (
          <AugmentationView
            selectedDataset={selectedDataset}
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'video-extraction':
        return (
          <VideoExtractionView
            selectedDataset={selectedDataset}
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'split':
        return (
          <SplitView
            selectedDataset={selectedDataset}
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'convert':
        return (
          <ConvertView
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'merge':
        return (
          <MergeView
            datasets={datasets}
            setDatasets={setDatasets}
            apiUrl={apiUrl}
          />
        )
      case 'training':
        return (
          <TrainingView
            datasets={datasets}
            apiUrl={apiUrl}
          />
        )
      case 'models':
        return (
          <ModelsView
            apiUrl={apiUrl}
          />
        )
      case 'yaml-wizard':
        return (
          <YamlWizardView
            selectedDataset={selectedDataset}
            apiUrl={apiUrl}
          />
        )
      case 'settings':
        return <SettingsView />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-background flex-col overflow-hidden">
      {/* GPU status banner */}
      {gpuStatus && (
        <div className={`flex items-center gap-3 px-4 py-2 text-xs font-medium z-50 shrink-0 ${
          gpuStatus.state === 'failed'
            ? 'bg-destructive/90 text-destructive-foreground'
            : 'bg-warning/90 text-warning-foreground'
        }`}>
          <span className="shrink-0 text-sm">
            {gpuStatus.state === 'installing' ? '⏳' : '⚠️'}
          </span>
          <span className="flex-1 truncate">{gpuStatus.message}</span>
          {gpuStatus.state === 'failed' && (
            <button
              className="shrink-0 underline text-xs opacity-80 hover:opacity-100"
              onClick={() => setGpuStatus(null)}
            >
              Dismiss
            </button>
          )}
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          selectedDataset={selectedDataset}
        />
        <main className="flex-1 overflow-y-auto min-w-0 bg-background">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
