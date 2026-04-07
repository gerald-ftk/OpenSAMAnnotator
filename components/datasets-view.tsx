'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, 
  FolderOpen, 
  Trash2, 
  Download,
  Database,
  Image,
  Tag,
  Calendar,
  CheckCircle,
  AlertCircle,
  Folder,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'

interface DatasetsViewProps {
  datasets: Dataset[]
  setDatasets: (datasets: Dataset[]) => void
  selectedDataset: Dataset | null
  onSelectDataset: (dataset: Dataset) => void
  onDatasetLoaded?: (datasetId: string) => void
  apiUrl: string
}

interface FolderItem {
  name: string
  path: string
  is_directory: boolean
  is_dataset: boolean
  format_hint?: string
}

export function DatasetsView({ 
  datasets, 
  setDatasets, 
  selectedDataset, 
  onSelectDataset,
  onDatasetLoaded,
  apiUrl 
}: DatasetsViewProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'processing' | 'complete' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Folder browser state
  const [showFolderBrowser, setShowFolderBrowser] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [folderItems, setFolderItems] = useState<FolderItem[]>([])
  const [isLoadingFolder, setIsLoadingFolder] = useState(false)
  const [manualPath, setManualPath] = useState('')

  // Fetch datasets from backend on mount and whenever apiUrl changes.
  // This restores the list after a page refresh or backend restart.
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/datasets`)
        if (response.ok) {
          const data = await response.json()
          if (data.datasets && data.datasets.length > 0) {
            setDatasets(data.datasets)
          }
        }
      } catch {
        // Backend may not be running yet — fail silently
      }
    }
    fetchDatasets()
  }, [apiUrl])

  const browseFolders = async (path: string = '') => {
    setIsLoadingFolder(true)
    try {
      const response = await fetch(`${apiUrl}/api/browse-folders?path=${encodeURIComponent(path || '.')}`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentPath(data.current_path || path)
        setFolderItems(data.items || [])
        setManualPath(data.current_path || path)
      }
    } catch (err) {
      console.error('Failed to browse folders:', err)
    } finally {
      setIsLoadingFolder(false)
    }
  }

  const handleOpenFolderBrowser = () => {
    setShowFolderBrowser(true)
    browseFolders('')
  }

  const handleFolderClick = (item: FolderItem) => {
    if (item.is_directory) {
      browseFolders(item.path)
    }
  }

  const handleLoadLocalDataset = async (path: string, formatHint?: string) => {
    setIsLoadingFolder(true)
    setError(null)
    setSuccess(null)
    setSuccess(`Loading dataset from ${path}...`)
    
    try {
      const response = await fetch(`${apiUrl}/api/datasets/load-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, format_hint: formatHint })
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to load dataset')
      }
      
      const result = await response.json()
      
      if (result.success && result.dataset) {
        setDatasets([...datasets, result.dataset])
        onSelectDataset(result.dataset)
        onDatasetLoaded?.(result.dataset.id)
        setShowFolderBrowser(false)
        setSuccess(`Successfully loaded ${result.dataset.name}`)
        setTimeout(() => setSuccess(null), 3000)
      } else if (result.error) {
        throw new Error(result.error)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      setError(errorMsg === '[object Object]' ? 'Failed to load dataset - check folder path' : errorMsg)
    } finally {
      setIsLoadingFolder(false)
    }
  }

  const handleManualPathSubmit = () => {
    if (manualPath.trim()) {
      browseFolders(manualPath.trim())
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }, [apiUrl, datasets])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await uploadFiles(files)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('uploading')
    setError(null)

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))

    const xhr = new XMLHttpRequest()

    const uploadPromise = new Promise<{success: boolean, dataset?: Dataset}>((resolve, reject) => {
      // Track upload progress (bytes sent to server)
      xhr.upload.addEventListener('loadstart', () => {
        setUploadProgress(2)
      })

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && e.total > 0) {
          // Upload progress is 0-80% of total; processing takes the rest
          const uploadPercent = Math.round((e.loaded / e.total) * 80)
          setUploadProgress(Math.max(2, uploadPercent))
          if (e.loaded >= e.total) {
            setUploadStatus('processing')
            setUploadProgress(80)
          }
        }
      })

      xhr.upload.addEventListener('load', () => {
        // Upload complete, server is now processing
        setUploadStatus('processing')
        setUploadProgress(85)
      })

      xhr.addEventListener('progress', () => {
        // Server is streaming response (processing)
        if (uploadStatus !== 'processing') {
          setUploadStatus('processing')
        }
      })

      xhr.addEventListener('load', () => {
        setUploadProgress(100)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            resolve(result)
          } catch {
            reject(new Error('Invalid response from server'))
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            reject(new Error(err.detail || 'Upload failed'))
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        }
      })
      
      xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))
      
      xhr.open('POST', `${apiUrl}/api/datasets/load`)
      xhr.send(formData)
    })

    try {
      const result = await uploadPromise
      
      if (result.success && result.dataset) {
        setDatasets([...datasets, result.dataset])
        onSelectDataset(result.dataset)
        onDatasetLoaded?.(result.dataset.id)
        setUploadStatus('complete')
        setSuccess(`Successfully loaded ${result.dataset.name}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadStatus(null), 1000)
    }
  }

  const handleDelete = async (datasetId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/datasets/${datasetId}`, { method: 'DELETE' })
      if (response.ok) {
        const newDatasets = datasets.filter(d => d.id !== datasetId)
        setDatasets(newDatasets)
        if (selectedDataset?.id === datasetId) {
          onSelectDataset(newDatasets[0] || null as unknown as Dataset)
        }
        setSuccess('Dataset removed')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to delete dataset')
    }
  }

  const handleExport = async (dataset: Dataset) => {
    try {
      window.open(`${apiUrl}/api/export/${dataset.id}`, '_blank')
    } catch (err) {
      setError('Failed to export dataset')
    }
  }

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'classification': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'detection': return 'bg-green-500/10 text-green-600 dark:text-green-400'
      case 'segmentation': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getProgressLabel = () => {
    if (uploadStatus === 'processing') return 'Processing dataset on server...'
    if (uploadStatus === 'complete') return 'Complete!'
    if (uploadProgress < 5) return 'Starting upload...'
    return `Uploading... ${uploadProgress}%`
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Datasets</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Load, manage, and organize your computer vision datasets
          </p>
        </div>
        <Button onClick={handleOpenFolderBrowser} variant="outline">
          <FolderOpen className="w-4 h-4 mr-2" />
          Open Local Folder
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className={cn(
          "mb-4 p-3 rounded-lg flex items-center gap-2",
          success.includes('Loading') || success.includes('...')
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
        )}>
          {success.includes('Loading') || success.includes('...') ? (
            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 mb-6 transition-all',
          'flex flex-col items-center justify-center text-center',
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-muted-foreground/50 bg-card/50'
        )}
      >
        <div className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center mb-4',
          dragActive ? 'bg-primary/10' : 'bg-secondary'
        )}>
          {isUploading && uploadStatus === 'processing' ? (
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          ) : (
            <Upload className={cn('w-6 h-6', dragActive ? 'text-primary' : 'text-muted-foreground')} />
          )}
        </div>
        
        <h3 className="text-lg font-medium mb-2">
          {isUploading 
            ? uploadStatus === 'processing' 
              ? 'Processing Dataset...' 
              : 'Uploading...' 
            : 'Drop your dataset here'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Supports ZIP files with YOLO, COCO, Pascal VOC, LabelMe, and classification folder formats
        </p>
        
        {isUploading ? (
          <div className="w-full max-w-sm space-y-2">
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  uploadStatus === 'processing' ? 'bg-amber-500' : 
                  uploadStatus === 'complete' ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ 
                  width: uploadStatus === 'processing' ? '100%' : `${Math.max(2, uploadProgress)}%`,
                  animation: uploadStatus === 'processing' ? 'pulse 1.5s ease-in-out infinite' : 'none'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{getProgressLabel()}</p>
          </div>
        ) : (
          <label className="cursor-pointer">
            <Input 
              type="file" 
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button asChild variant="secondary">
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Upload ZIP
              </span>
            </Button>
          </label>
        )}
      </div>

      {/* Dataset Grid */}
      <div className="flex-1 overflow-y-auto">
        {datasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No datasets loaded</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Upload a ZIP file or open a local folder to get started
            </p>
            <Button variant="outline" onClick={handleOpenFolderBrowser}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Browse Local Folders
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card 
                key={dataset.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md group',
                  selectedDataset?.id === dataset.id && 'ring-2 ring-primary shadow-md'
                )}
                onClick={() => onSelectDataset(dataset)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{dataset.name}</CardTitle>
                      <CardDescription className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs font-medium">
                          {dataset.format.toUpperCase()}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getTaskTypeColor(dataset.task_type))}>
                          {dataset.task_type}
                        </span>
                      </CardDescription>
                    </div>
                    {selectedDataset?.id === dataset.id && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="w-4 h-4" />
                      <span>{dataset.num_images.toLocaleString()} images</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Tag className="w-4 h-4" />
                      <span>{dataset.classes?.length || 0} classes</span>
                    </div>
                  </div>

                  {dataset.classes && dataset.classes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex flex-wrap gap-1">
                        {dataset.classes.slice(0, 4).map((cls, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-muted rounded text-xs">{cls}</span>
                        ))}
                        {dataset.classes.length > 4 && (
                          <span className="px-2 py-0.5 text-muted-foreground text-xs">
                            +{dataset.classes.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleExport(dataset) }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); handleDelete(dataset.id) }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Folder Browser Dialog */}
      <Dialog open={showFolderBrowser} onOpenChange={setShowFolderBrowser}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Browse Local Folders</DialogTitle>
            <DialogDescription>
              Navigate to your dataset folder and click &quot;Load&quot; to import it directly without uploading
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="Enter folder path (e.g., C:\datasets\my_dataset)"
                onKeyDown={(e) => e.key === 'Enter' && handleManualPathSubmit()}
                className="flex-1"
              />
              <Button onClick={handleManualPathSubmit} variant="secondary">Go</Button>
              <Button onClick={() => browseFolders(currentPath)} variant="ghost" size="icon">
                <RefreshCw className={cn('w-4 h-4', isLoadingFolder && 'animate-spin')} />
              </Button>
            </div>

            {currentPath && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg overflow-x-auto">
                <HardDrive className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{currentPath}</span>
              </div>
            )}

            <ScrollArea className="h-[350px] border rounded-lg">
              {isLoadingFolder ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : folderItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Folder className="w-12 h-12 mb-2 opacity-50" />
                  <p>No folders found</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {folderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                        item.is_dataset 
                          ? 'bg-primary/5 hover:bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted'
                      )}
                      onClick={() => handleFolderClick(item)}
                    >
                      <Folder className={cn('w-5 h-5 flex-shrink-0', item.is_dataset ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.is_dataset && item.format_hint && (
                          <p className="text-xs text-muted-foreground">Detected: {item.format_hint}</p>
                        )}
                      </div>
                      {item.is_dataset ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleLoadLocalDataset(item.path, item.format_hint) }}>
                          Load
                        </Button>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {currentPath && (
              <Button className="w-full" onClick={() => handleLoadLocalDataset(currentPath)} disabled={isLoadingFolder}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Current Folder as Dataset
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
