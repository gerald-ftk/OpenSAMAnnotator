'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  PieChart, 
  Image as ImageIcon,
  Tag,
  Layers,
  TrendingUp,
  Database,
  RefreshCw,
  Download,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'

interface DashboardViewProps {
  datasets: Dataset[]
  selectedDataset: Dataset | null
  onSelectDataset: (dataset: Dataset) => void
  setActiveView: (view: string) => void
  apiUrl: string
}

interface DatasetStats {
  dataset_id: string
  name: string
  format: string
  task_type: string
  total_images: number
  total_annotations: number
  classes: Record<string, any>
  class_distribution: Record<string, number>
  splits: Record<string, number>
  image_sizes: Record<string, any>
  avg_annotations_per_image: number
  created_at: string
}

const CLASS_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-lime-500', 'bg-fuchsia-500'
]

export function DashboardView({ 
  datasets, 
  selectedDataset, 
  onSelectDataset,
  setActiveView,
  apiUrl 
}: DashboardViewProps) {
  const [stats, setStats] = useState<DatasetStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (selectedDataset) {
      loadStats()
    }
  }, [selectedDataset])

  const loadStats = async () => {
    if (!selectedDataset) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = () => {
    if (!stats || !selectedDataset) return
    const report = {
      dataset: {
        id: selectedDataset.id,
        name: selectedDataset.name,
        format: selectedDataset.format,
        task_type: selectedDataset.task_type,
        created_at: selectedDataset.created_at,
      },
      summary: {
        total_images: stats.total_images,
        total_annotations: stats.total_annotations,
        num_classes: Object.keys(stats.class_distribution || {}).length,
        avg_annotations_per_image: stats.avg_annotations_per_image,
      },
      class_distribution: stats.class_distribution,
      splits: stats.splits,
      classes: stats.classes,
      generated_at: new Date().toISOString(),
    }
    // Download as JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedDataset.name}_report_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    // Also offer CSV of class distribution
    const csv = ['class,count,percentage']
    const total = Object.values(stats.class_distribution || {}).reduce((a: number, b: unknown) => a + (b as number), 0) as number
    Object.entries(stats.class_distribution || {}).forEach(([cls, count]) => {
      csv.push(`${cls},${count},${total > 0 ? ((count as number / total) * 100).toFixed(2) : 0}%`)
    })
    const csvBlob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const csvUrl = URL.createObjectURL(csvBlob)
    const csvA = document.createElement('a')
    csvA.href = csvUrl
    csvA.download = `${selectedDataset.name}_classes_${new Date().toISOString().split('T')[0]}.csv`
    setTimeout(() => { csvA.click(); URL.revokeObjectURL(csvUrl) }, 300)
  }

  const totalAnnotations = stats?.class_distribution 
    ? Object.values(stats.class_distribution).reduce((a, b) => a + b, 0)
    : 0

  const sortedClasses = stats?.class_distribution 
    ? Object.entries(stats.class_distribution).sort(([, a], [, b]) => b - a)
    : []

  if (!selectedDataset) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your datasets and statistics
          </p>
        </div>

        {datasets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No Datasets</h3>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                Load a dataset to view statistics
              </p>
              <Button onClick={() => setActiveView('datasets')}>
                Load Dataset
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card 
                key={dataset.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectDataset(dataset)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{dataset.name}</CardTitle>
                  <CardDescription>
                    {dataset.format.toUpperCase()} - {dataset.task_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{dataset.num_images} images</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{selectedDataset.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Dataset overview and statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport} disabled={!stats}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Images</p>
                <p className="text-3xl font-bold">{(stats?.total_images ?? selectedDataset.num_images).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Annotations</p>
                <p className="text-3xl font-bold">{(stats?.total_annotations ?? selectedDataset.num_annotations).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Tag className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-3xl font-bold">{Object.keys(stats?.class_distribution || {}).length || selectedDataset.classes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Layers className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg per Image</p>
                <p className="text-3xl font-bold">
                  {(stats?.avg_annotations_per_image ?? (selectedDataset.num_images > 0 ? selectedDataset.num_annotations / selectedDataset.num_images : 0)).toFixed(1)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Class Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Class Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedClasses.map(([className, count], idx) => {
                const percentage = totalAnnotations > 0 ? (count / totalAnnotations) * 100 : 0
                return (
                  <div key={className}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate flex-1 mr-2">{className}</span>
                      <span className="text-sm text-muted-foreground">
                        {count.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all", CLASS_COLORS[idx % CLASS_COLORS.length])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {sortedClasses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No class distribution data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dataset Splits */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Dataset Splits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.splits && Object.keys(stats.splits).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.splits).map(([split, count]) => {
                  const totalImgs = stats?.total_images || selectedDataset.num_images || 1
                  const percentage = (count / totalImgs) * 100
                  const colors: Record<string, string> = {
                    train: 'bg-blue-500',
                    val: 'bg-emerald-500',
                    valid: 'bg-emerald-500',
                    validation: 'bg-emerald-500',
                    test: 'bg-amber-500'
                  }
                  return (
                    <div key={split}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{split}</span>
                        <span className="text-sm text-muted-foreground">
                          {count.toLocaleString()} images ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No splits configured for this dataset
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveView('convert')}>
                  Create Splits
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dataset Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dataset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Format</p>
              <p className="font-medium">{selectedDataset.format.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Task Type</p>
              <p className="font-medium capitalize">{stats?.task_type || selectedDataset.task_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(selectedDataset.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dataset ID</p>
              <p className="font-medium font-mono text-xs">{selectedDataset.id.slice(0, 12)}...</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-2">Classes</p>
            <div className="flex flex-wrap gap-2">
              {selectedDataset.classes.map((cls, idx) => (
                <span 
                  key={cls}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium text-white",
                    CLASS_COLORS[idx % CLASS_COLORS.length]
                  )}
                >
                  {cls}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setActiveView('annotate')}>
              <Tag className="w-5 h-5 mb-2" />
              <span className="text-sm">Annotate</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setActiveView('sorting')}>
              <Layers className="w-5 h-5 mb-2" />
              <span className="text-sm">Sort & Filter</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setActiveView('convert')}>
              <RefreshCw className="w-5 h-5 mb-2" />
              <span className="text-sm">Convert</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" onClick={() => setActiveView('training')}>
              <TrendingUp className="w-5 h-5 mb-2" />
              <span className="text-sm">Train Model</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}