'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Play, Pause, ArrowLeft, ArrowRight, Check, X, Save,
  AlertCircle, Keyboard, Loader2, FolderOpen, Images, Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset, ImageData, Annotation, ImageCache } from '@/app/page'

interface SortingViewProps {
  selectedDataset: Dataset | null
  apiUrl: string
  imageCache: ImageCache
  updateImageCache: (datasetId: string, images: ImageData[]) => void
}

// Canvas renderer — draws image + annotation overlays
function ImageWithAnnotations({ src, annotations, taskType, onLoad }: {
  src: string
  annotations: Annotation[]
  taskType: string
  onLoad?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsLoading(true)
    setLoadError(false)

    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      if (taskType !== 'classification' && annotations.length > 0) {
        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        annotations.forEach((ann) => {
          const color = colors[(ann.class_id || 0) % colors.length]
          const lw = Math.max(2, img.width / 400)
          const fs = Math.max(12, img.width / 60)
          ctx.strokeStyle = color
          ctx.lineWidth = lw
          ctx.fillStyle = color + '30'

          if (ann.bbox && ann.bbox.length === 4) {
            const [x, y, w, h] = ann.bbox
            ctx.fillRect(x, y, w, h)
            ctx.strokeRect(x, y, w, h)
            ctx.fillStyle = color
            ctx.font = `bold ${fs}px sans-serif`
            const tw = ctx.measureText(ann.class_name || '').width + 10
            ctx.fillRect(x, y - fs - 6, tw, fs + 6)
            ctx.fillStyle = '#fff'
            ctx.fillText(ann.class_name || '', x + 5, y - 4)
          } else if (ann.x_center !== undefined && ann.width !== undefined) {
            // YOLO normalized bbox
            const cx = ann.x_center * img.width
            const cy = (ann.y_center || 0) * img.height
            const w = ann.width * img.width
            const h = (ann.height || 0) * img.height
            const x = cx - w / 2, y = cy - h / 2
            ctx.fillRect(x, y, w, h)
            ctx.strokeRect(x, y, w, h)
            ctx.fillStyle = color
            ctx.font = `bold ${fs}px sans-serif`
            const tw = ctx.measureText(ann.class_name || '').width + 10
            ctx.fillRect(x, y - fs - 6, tw, fs + 6)
            ctx.fillStyle = '#fff'
            ctx.fillText(ann.class_name || '', x + 5, y - 4)
          } else if (ann.points && ann.points.length >= 4) {
            // Polygon — points may be normalized (0-1) or absolute pixels
            const pts = ann.points
            const isNorm = ann.normalized || (pts[0] <= 1 && pts[1] <= 1 && pts.every(p => p >= 0 && p <= 1))
            ctx.beginPath()
            const px0 = isNorm ? pts[0] * img.width : pts[0]
            const py0 = isNorm ? pts[1] * img.height : pts[1]
            ctx.moveTo(px0, py0)
            for (let i = 2; i < pts.length; i += 2) {
              const px = isNorm ? pts[i] * img.width : pts[i]
              const py = isNorm ? pts[i + 1] * img.height : pts[i + 1]
              ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
            // Label at first point
            ctx.fillStyle = color
            ctx.font = `bold ${fs}px sans-serif`
            const tw = ctx.measureText(ann.class_name || '').width + 10
            ctx.fillRect(px0, py0 - fs - 6, tw, fs + 6)
            ctx.fillStyle = '#fff'
            ctx.fillText(ann.class_name || '', px0 + 5, py0 - 4)
          }
        })
      }

      setIsLoading(false)
      onLoad?.()
    }

    img.onerror = () => { setIsLoading(false); setLoadError(true) }
    img.src = src
  }, [src, annotations, taskType])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 z-10 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading image...</p>
        </div>
      )}
      {loadError ? (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="w-10 h-10 opacity-40" />
          <p className="text-sm">Failed to load image</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
      )}
    </div>
  )
}

export function SortingView({ selectedDataset, apiUrl, imageCache, updateImageCache }: SortingViewProps) {
  const [allImages, setAllImages] = useState<ImageData[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [kept, setKept] = useState<Set<string>>(new Set())
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedSplit, setSelectedSplit] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [availableSplits, setAvailableSplits] = useState<string[]>([])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!selectedDataset) return
    const cached = imageCache[selectedDataset.id]
    if (cached && cached.length > 0) {
      // Use cached images — no server round-trip
      initFromImages(cached)
    } else {
      loadAllImages()
    }
  }, [selectedDataset])

  // Re-filter when split/class filter changes
  useEffect(() => {
    let imgs = allImages
    if (selectedSplit !== 'all') imgs = imgs.filter(i => i.split === selectedSplit)
    if (selectedClass !== 'all') {
      imgs = imgs.filter(i =>
        i.class_name === selectedClass ||
        (i.annotations || []).some(a => a.class_name === selectedClass)
      )
    }
    setFilteredImages(imgs)
    setCurrentIndex(0)
    setIsComplete(false)
  }, [selectedSplit, selectedClass, allImages])

  const initFromImages = (images: ImageData[]) => {
    setAllImages(images)
    const splits = [...new Set(images.map(i => i.split).filter(Boolean) as string[])]
    const classes = [...new Set(
      images.flatMap(i => [
        i.class_name,
        ...(i.annotations || []).map(a => a.class_name)
      ]).filter(Boolean) as string[]
    )]
    setAvailableSplits(splits)
    setAvailableClasses(classes)
    setKept(new Set())
    setDeleted(new Set())
    setCurrentIndex(0)
    setIsComplete(false)
  }

  const loadAllImages = async () => {
    if (!selectedDataset) return
    setIsLoading(true)
    setLoadProgress(10)
    setError(null)

    try {
      setLoadProgress(30)
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/images?limit=999999`)
      if (!response.ok) throw new Error('Failed to load images')
      setLoadProgress(70)
      const data = await response.json()
      const images: ImageData[] = data.images || []
      setLoadProgress(95)
      updateImageCache(selectedDataset.id, images)
      initFromImages(images)
      setLoadProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images')
    } finally {
      setIsLoading(false)
    }
  }

  const currentImage = filteredImages[currentIndex]
  const total = filteredImages.length

  const handleAction = (action: 'keep' | 'delete') => {
    if (!currentImage || isPaused) return
    if (action === 'keep') {
      setKept(prev => new Set([...prev, currentImage.id]))
      setDeleted(prev => { const s = new Set(prev); s.delete(currentImage.id); return s })
    } else {
      setDeleted(prev => new Set([...prev, currentImage.id]))
      setKept(prev => { const s = new Set(prev); s.delete(currentImage.id); return s })
    }
    if (currentIndex < total - 1) setCurrentIndex(i => i + 1)
    else setIsComplete(true)
  }

  const navigateImage = (dir: 'prev' | 'next') => {
    if (dir === 'prev' && currentIndex > 0) setCurrentIndex(i => i - 1)
    else if (dir === 'next' && currentIndex < total - 1) setCurrentIndex(i => i + 1)
  }

  const saveResults = async () => {
    if (!selectedDataset) return
    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_ids: Array.from(kept), delete_ids: Array.from(deleted) })
      })
      if (!response.ok) throw new Error('Failed to save filter results')
      await loadAllImages()
      setIsComplete(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || !currentImage) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); isPaused ? navigateImage('prev') : handleAction('delete') }
      else if (e.key === 'ArrowRight') { e.preventDefault(); isPaused ? navigateImage('next') : handleAction('keep') }
      else if (e.key === ' ') { e.preventDefault(); setIsPaused(p => !p) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentImage, currentIndex, isPaused, isLoading, total])

  const progress = total > 0 ? ((kept.size + deleted.size) / total) * 100 : 0

  if (!selectedDataset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No dataset selected</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Select a dataset from the Datasets view</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center w-72">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-lg font-medium">Loading Dataset</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Fetching {selectedDataset.num_images?.toLocaleString()} images...
          </p>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${loadProgress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{loadProgress}%</p>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="h-full flex flex-col p-6">
        <h2 className="text-2xl font-semibold mb-2">Sorting Complete</h2>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader><CardTitle className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" />Session Complete</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-primary">{kept.size}</p>
                  <p className="text-sm text-muted-foreground">Images Kept</p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg text-center">
                  <p className="text-3xl font-bold text-destructive">{deleted.size}</p>
                  <p className="text-sm text-muted-foreground">Images Removed</p>
                </div>
              </div>
              {total - kept.size - deleted.size > 0 && (
                <p className="text-center text-sm text-muted-foreground">{total - kept.size - deleted.size} images not yet reviewed</p>
              )}
              <div className="space-y-2">
                <Button className="w-full" onClick={saveResults}><Save className="w-4 h-4 mr-2" />Save Filtered Dataset</Button>
                <Button variant="outline" className="w-full" onClick={() => { setKept(new Set()); setDeleted(new Set()); setCurrentIndex(0); setIsComplete(false) }}>Start Over</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Sort & Filter</h2>
          <p className="text-muted-foreground text-sm truncate max-w-sm mt-0.5">{currentImage?.filename || 'No image'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Split filter */}
          <Select value={selectedSplit} onValueChange={setSelectedSplit}>
            <SelectTrigger className="w-36">
              <FolderOpen className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All splits ({allImages.length})</SelectItem>
              {availableSplits.map(split => (
                <SelectItem key={split} value={split}>
                  {split.charAt(0).toUpperCase() + split.slice(1)} ({allImages.filter(i => i.split === split).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class filter */}
          {availableClasses.length > 0 && (
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-36">
                <Tag className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {availableClasses.map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={() => setIsPaused(p => !p)}>
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? 'Sort Mode' : 'Browse Mode'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">
            {currentIndex + 1} / {total}
            {selectedSplit !== 'all' && <span className="ml-1 text-xs opacity-60">({selectedSplit})</span>}
            {selectedClass !== 'all' && <span className="ml-1 text-xs opacity-60">· {selectedClass}</span>}
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-primary flex items-center gap-1"><Check className="w-3.5 h-3.5" />{kept.size} kept</span>
            <span className="text-destructive flex items-center gap-1"><X className="w-3.5 h-3.5" />{deleted.size} removed</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Image area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 min-h-0">
        {currentImage ? (
          <div className={cn(
            'relative w-full max-w-4xl h-[58vh] bg-black/50 rounded-xl overflow-hidden shadow-lg',
            isPaused && 'ring-2 ring-yellow-400'
          )}>
            <ImageWithAnnotations
              src={`${apiUrl}/api/datasets/${selectedDataset.id}/image-file/${currentImage.path}`}
              annotations={currentImage.annotations || []}
              taskType={selectedDataset.task_type}
            />
            {kept.has(currentImage.id) && (
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow">
                <Check className="w-3 h-3" /> Kept
              </div>
            )}
            {deleted.has(currentImage.id) && (
              <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow">
                <X className="w-3 h-3" /> Removed
              </div>
            )}
            {currentImage.annotations && currentImage.annotations.length > 0 && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2.5">
                  <p className="text-white text-xs font-medium mb-1.5">{currentImage.annotations.length} annotation{currentImage.annotations.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-1">
                    {currentImage.annotations.slice(0, 8).map((ann, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-primary/80 text-primary-foreground rounded text-xs">{ann.class_name}</span>
                    ))}
                    {currentImage.annotations.length > 8 && (
                      <span className="px-2 py-0.5 bg-muted/80 text-muted-foreground rounded text-xs">+{currentImage.annotations.length - 8} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {currentImage.class_name && (
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow">{currentImage.class_name}</span>
              </div>
            )}
            {isPaused && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold shadow">BROWSE MODE</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>No images match current filters</p>
          </div>
        )}

        <div className="flex items-center gap-6">
          <Button size="lg" variant={isPaused ? 'outline' : 'destructive'} className="w-36 h-12"
            onClick={() => isPaused ? navigateImage('prev') : handleAction('delete')}
            disabled={isPaused && currentIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />{isPaused ? 'Prev' : 'Remove'}
          </Button>
          <Button size="lg" variant={isPaused ? 'outline' : 'default'} className="w-36 h-12"
            onClick={() => isPaused ? navigateImage('next') : handleAction('keep')}
            disabled={isPaused && currentIndex >= total - 1}>
            {isPaused ? 'Next' : 'Keep'}<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Keyboard className="w-4 h-4" />
          <span>{isPaused ? 'Arrow keys to browse • Space to sort mode' : '← Remove • → Keep • Space to browse'}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}
    </div>
  )
}
