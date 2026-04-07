'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  RefreshCw, 
  ArrowRight,
  Download,
  CheckCircle,
  AlertCircle,
  FileJson,
  FileText,
  FileCode
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'

interface ConvertViewProps {
  datasets: Dataset[]
  setDatasets: (datasets: Dataset[]) => void
  apiUrl: string
}

interface Format {
  id: string
  name: string
  extensions: string[]
  task: string[]
}

const formatIcons: Record<string, React.ElementType> = {
  'yolo': FileText,
  'coco': FileJson,
  'pascal-voc': FileCode,
  'labelme': FileJson,
  'tensorflow-csv': FileText,
  'createml': FileJson,
}

export function ConvertView({ datasets, setDatasets, apiUrl }: ConvertViewProps) {
  const [formats, setFormats] = useState<Format[]>([])
  const [sourceDataset, setSourceDataset] = useState<string>('')
  const [targetFormat, setTargetFormat] = useState<string>('')
  const [outputName, setOutputName] = useState<string>('')
  const [isConverting, setIsConverting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; dataset?: Dataset } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFormats()
  }, [])

  const loadFormats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/formats`)
      if (response.ok) {
        const data = await response.json()
        setFormats(data.formats || [])
      }
    } catch (err) {
      console.error('Failed to load formats')
    }
  }

  const handleConvert = async () => {
    if (!sourceDataset || !targetFormat) return

    setIsConverting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${apiUrl}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: sourceDataset,
          target_format: targetFormat,
          output_name: outputName || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Conversion failed')
      }

      if (data.success && data.new_dataset) {
        setDatasets([...datasets, data.new_dataset])
        setResult({
          success: true,
          message: `Dataset converted to ${targetFormat.toUpperCase()} successfully!`,
          dataset: data.new_dataset
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsConverting(false)
    }
  }

  const handleExport = async () => {
    if (!sourceDataset) return
    
    const format = targetFormat || datasets.find(d => d.id === sourceDataset)?.format
    window.open(`${apiUrl}/api/export/${sourceDataset}?target_format=${format}`, '_blank')
  }

  const sourceFormat = datasets.find(d => d.id === sourceDataset)?.format

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Convert Format</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Convert datasets between different annotation formats
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Dataset</CardTitle>
            <CardDescription>Select the dataset to convert</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={sourceDataset} onValueChange={setSourceDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    <div className="flex items-center gap-2">
                      <span>{dataset.name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                        {dataset.format}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sourceDataset && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">{sourceFormat?.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Images</span>
                  <span>{datasets.find(d => d.id === sourceDataset)?.num_images}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annotations</span>
                  <span>{datasets.find(d => d.id === sourceDataset)?.num_annotations}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Format</CardTitle>
            <CardDescription>Choose the output format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={targetFormat} onValueChange={setTargetFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((format) => {
                  const Icon = formatIcons[format.id] || FileText
                  return (
                    <SelectItem key={format.id} value={format.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{format.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Output Name (optional)
              </label>
              <Input
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="Converted dataset name"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Arrow */}
      {sourceDataset && targetFormat && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <span className="font-medium">{sourceFormat?.toUpperCase()}</span>
          </div>
          <ArrowRight className="w-6 h-6 text-primary" />
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <span className="font-medium text-primary">{targetFormat.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          size="lg"
          onClick={handleConvert}
          disabled={!sourceDataset || !targetFormat || isConverting}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isConverting && 'animate-spin')} />
          {isConverting ? 'Converting...' : 'Convert Dataset'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleExport}
          disabled={!sourceDataset}
        >
          <Download className="w-4 h-4 mr-2" />
          Export as ZIP
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Card className={cn(
          'mb-6',
          result.success ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">{result.message}</p>
                {result.dataset && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Created: {result.dataset.name} ({result.dataset.num_images} images)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Formats</CardTitle>
          <CardDescription>All available annotation formats for conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {formats.map((format) => {
              const Icon = formatIcons[format.id] || FileText
              return (
                <div
                  key={format.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    targetFormat === format.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{format.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(format.task || []).map((task) => (
                      <span key={task} className="text-xs px-1.5 py-0.5 bg-muted rounded">
                        {task}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
