'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Layers,
  Plus,
  Trash2,
  GitMerge,
  Download,
  AlertCircle,
  Check,
  X,
  Wand2,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'

interface ClassManagerViewProps {
  selectedDataset: Dataset | null
  datasets: Dataset[]
  setDatasets: (datasets: Dataset[]) => void
  apiUrl: string
}

interface ClassInfo {
  name: string
  count: number
  selected: boolean
}

const CLASS_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
  'bg-violet-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500'
]

export function ClassManagerView({ 
  selectedDataset, 
  datasets,
  setDatasets,
  apiUrl 
}: ClassManagerViewProps) {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [newClassName, setNewClassName] = useState('')
  const [mergeTargetName, setMergeTargetName] = useState('')
  const [extractName, setExtractName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<'extract' | 'delete' | 'merge' | 'add' | null>(null)

  useEffect(() => {
    if (selectedDataset) {
      loadClasses()
    }
  }, [selectedDataset])

  const loadClasses = async () => {
    if (!selectedDataset) return

    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/classes`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes.map((c: any) => ({
          name: c.name || c,
          count: c.count || 0,
          selected: false
        })))
      }
    } catch (err) {
      setError('Failed to load classes')
    }
  }

  const toggleClass = (className: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(className)) {
      newSelected.delete(className)
    } else {
      newSelected.add(className)
    }
    setSelectedClasses(newSelected)
  }

  const selectAll = () => {
    if (selectedClasses.size === classes.length) {
      setSelectedClasses(new Set())
    } else {
      setSelectedClasses(new Set(classes.map(c => c.name)))
    }
  }

  const handleExtractClasses = async () => {
    if (!selectedDataset || selectedClasses.size === 0 || !extractName.trim()) return

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/extract-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          classes_to_extract: Array.from(selectedClasses),
          output_name: extractName.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to extract classes')

      const data = await response.json()
      setDatasets([...datasets, data.new_dataset])
      setSuccess(`Successfully extracted ${selectedClasses.size} classes to "${extractName}"`)
      setSelectedClasses(new Set())
      setExtractName('')
      setActiveAction(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extract failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClasses = async () => {
    if (!selectedDataset || selectedClasses.size === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/delete-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          classes_to_delete: Array.from(selectedClasses)
        })
      })

      if (!response.ok) throw new Error('Failed to delete classes')

      const data = await response.json()
      
      // Update datasets state
      const updatedDatasets = datasets.map(d => 
        d.id === selectedDataset.id ? data.updated_dataset : d
      )
      setDatasets(updatedDatasets)
      
      setSuccess(`Deleted ${selectedClasses.size} classes (${data.deleted_annotations} annotations removed)`)
      setSelectedClasses(new Set())
      setActiveAction(null)
      loadClasses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMergeClasses = async () => {
    if (!selectedDataset || selectedClasses.size < 2 || !mergeTargetName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/merge-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          source_classes: Array.from(selectedClasses),
          target_class: mergeTargetName.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to merge classes')

      const data = await response.json()
      
      // Update datasets state
      const updatedDatasets = datasets.map(d => 
        d.id === selectedDataset.id ? data.updated_dataset : d
      )
      setDatasets(updatedDatasets)
      
      setSuccess(`Merged ${selectedClasses.size} classes into "${mergeTargetName}"`)
      setSelectedClasses(new Set())
      setMergeTargetName('')
      setActiveAction(null)
      loadClasses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClass = async () => {
    if (!selectedDataset || !newClassName.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/add-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          new_classes: [newClassName.trim()],
          use_model: false
        })
      })

      if (!response.ok) throw new Error('Failed to add class')

      const data = await response.json()
      
      // Update datasets state
      const updatedDatasets = datasets.map(d => 
        d.id === selectedDataset.id ? data.updated_dataset : d
      )
      setDatasets(updatedDatasets)
      
      setSuccess(`Added class "${newClassName}"`)
      setNewClassName('')
      setActiveAction(null)
      loadClasses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedDataset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No dataset selected</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Select a dataset from the Datasets view to manage classes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Class Manager</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Extract, delete, merge, or add classes in your dataset
          </p>
        </div>
      </div>

      {(error || success) && (
        <div className={cn(
          "mb-4 p-3 rounded-lg flex items-center gap-2",
          error ? "bg-destructive/10 border border-destructive/20 text-destructive" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600"
        )}>
          {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span className="text-sm flex-1">{error || success}</span>
          <button onClick={() => { setError(null); setSuccess(null); }} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Classes List */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Classes ({classes.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedClasses.size === classes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <CardDescription>
              {selectedClasses.size > 0 
                ? `${selectedClasses.size} class${selectedClasses.size > 1 ? 'es' : ''} selected`
                : 'Select classes to perform actions'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {classes.map((cls, idx) => (
                <div
                  key={cls.name}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    selectedClasses.has(cls.name) 
                      ? "bg-primary/10 border border-primary/30" 
                      : "hover:bg-muted border border-transparent"
                  )}
                  onClick={() => toggleClass(cls.name)}
                >
                  <Checkbox 
                    checked={selectedClasses.has(cls.name)}
                    onCheckedChange={() => toggleClass(cls.name)}
                  />
                  <div 
                    className={cn(
                      "w-3 h-3 rounded-full",
                      CLASS_COLORS[idx % CLASS_COLORS.length]
                    )}
                  />
                  <span className="flex-1 font-medium">{cls.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {cls.count?.toLocaleString() || 0} annotations
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions Panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Extract Classes */}
          <Card className={cn(activeAction === 'extract' && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="w-4 h-4" />
                Extract to New Dataset
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAction === 'extract' ? (
                <div className="space-y-3">
                  <Input
                    placeholder="New dataset name"
                    value={extractName}
                    onChange={(e) => setExtractName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleExtractClasses}
                      disabled={isLoading || selectedClasses.size === 0 || !extractName.trim()}
                      className="flex-1"
                    >
                      Extract
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setActiveAction(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setActiveAction('extract')}
                  disabled={selectedClasses.size === 0}
                >
                  Extract {selectedClasses.size} Classes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Merge Classes */}
          <Card className={cn(activeAction === 'merge' && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <GitMerge className="w-4 h-4" />
                Merge Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAction === 'merge' ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Merging: {Array.from(selectedClasses).join(', ')}
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Target class name"
                      value={mergeTargetName}
                      onChange={(e) => setMergeTargetName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleMergeClasses}
                      disabled={isLoading || selectedClasses.size < 2 || !mergeTargetName.trim()}
                      className="flex-1"
                    >
                      Merge
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setActiveAction(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setActiveAction('merge')}
                  disabled={selectedClasses.size < 2}
                >
                  Merge {selectedClasses.size} Classes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Delete Classes */}
          <Card className={cn(activeAction === 'delete' && "ring-2 ring-destructive")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                Delete Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAction === 'delete' ? (
                <div className="space-y-3">
                  <p className="text-xs text-destructive">
                    This will permanently delete all annotations for the selected classes.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={handleDeleteClasses}
                      disabled={isLoading || selectedClasses.size === 0}
                      className="flex-1"
                    >
                      Delete {selectedClasses.size} Classes
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setActiveAction(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setActiveAction('delete')}
                  disabled={selectedClasses.size === 0}
                >
                  Delete {selectedClasses.size} Classes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Add New Class */}
          <Card className={cn(activeAction === 'add' && "ring-2 ring-primary")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAction === 'add' ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Class name"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddClass}
                      disabled={isLoading || !newClassName.trim()}
                      className="flex-1"
                    >
                      Add Class
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setActiveAction(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setActiveAction('add')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
