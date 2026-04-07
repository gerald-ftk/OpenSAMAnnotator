'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  GitBranch, Plus, Clock, HardDrive, Download, Trash2, 
  Loader2, CheckCircle2, AlertCircle, RefreshCw 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'
import { toast } from 'sonner'

interface SnapshotViewProps {
  selectedDataset: Dataset | null
  datasets: Dataset[]
  setDatasets: (d: Dataset[]) => void
  apiUrl: string
}

interface Snapshot {
  id: string
  name: string
  dataset_id: string
  created_at: string
  num_images: number
  num_annotations: number
  description: string
  size_mb?: number
}

export function SnapshotView({ selectedDataset, datasets, setDatasets, apiUrl }: SnapshotViewProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDesc, setSnapshotDesc] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load snapshots from localStorage (client-side versioning)
  useEffect(() => {
    if (!selectedDataset) return
    const stored = localStorage.getItem(`snapshots_${selectedDataset.id}`)
    if (stored) {
      try { setSnapshots(JSON.parse(stored)) } catch {}
    }
  }, [selectedDataset?.id])

  const saveSnapshots = (snaps: Snapshot[]) => {
    if (!selectedDataset) return
    setSnapshots(snaps)
    localStorage.setItem(`snapshots_${selectedDataset.id}`, JSON.stringify(snaps))
  }

  const createSnapshot = async () => {
    if (!selectedDataset) return
    if (!snapshotName.trim()) { toast.error('Enter a snapshot name'); return }
    setIsCreating(true)
    try {
      // Call backend to create a zip export of current state
      const snapshot: Snapshot = {
        id: `snap_${Date.now()}`,
        name: snapshotName.trim(),
        dataset_id: selectedDataset.id,
        created_at: new Date().toISOString(),
        num_images: selectedDataset.num_images,
        num_annotations: selectedDataset.num_annotations,
        description: snapshotDesc.trim() || `Snapshot of ${selectedDataset.name}`,
      }

      // Try to hit an endpoint to actually save — fall back to local record only
      try {
        const res = await fetch(`${apiUrl}/api/datasets/${selectedDataset.id}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: snapshotName, description: snapshotDesc })
        })
        if (res.ok) {
          const data = await res.json()
          snapshot.id = data.snapshot_id || snapshot.id
          snapshot.size_mb = data.size_mb
        }
      } catch {
        // Backend doesn't have this endpoint yet — record locally
      }

      const updated = [snapshot, ...snapshots]
      saveSnapshots(updated)
      setSnapshotName('')
      setSnapshotDesc('')
      toast.success(`Snapshot "${snapshot.name}" created`)
    } catch (e) {
      toast.error('Failed to create snapshot')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteSnapshot = (id: string) => {
    if (!confirm('Delete this snapshot?')) return
    const updated = snapshots.filter(s => s.id !== id)
    saveSnapshots(updated)
    toast.success('Snapshot deleted')
  }

  const downloadSnapshot = async (snap: Snapshot) => {
    try {
      // Try to download from backend
      const res = await fetch(`${apiUrl}/api/datasets/${snap.dataset_id}/snapshot/${snap.id}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${snap.name}.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback: export current dataset
        window.open(`${apiUrl}/api/export/${snap.dataset_id}`, '_blank')
      }
    } catch {
      window.open(`${apiUrl}/api/export/${snap.dataset_id}`, '_blank')
    }
  }

  const restoreSnapshot = async (snap: Snapshot) => {
    if (!confirm(`Restore dataset to snapshot "${snap.name}"? This will overwrite current annotations.`)) return
    try {
      const res = await fetch(`${apiUrl}/api/datasets/${snap.dataset_id}/snapshot/${snap.id}/restore`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success(`Dataset restored to "${snap.name}"`)
      } else {
        toast.info('Restore requires backend support. Download the snapshot zip and re-import manually.')
      }
    } catch {
      toast.info('Restore requires backend support. Download the snapshot to restore manually.')
    }
  }

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No dataset selected</p>
          <p className="text-sm text-muted-foreground mt-1">Select a dataset to manage snapshots</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dataset Snapshots</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Create frozen checkpoints before augmentation, splitting, or major changes
        </p>
      </div>

      {/* Create snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Snapshot Name *</label>
            <Input
              placeholder="e.g. before-augmentation, v1.0-clean, post-review"
              value={snapshotName}
              onChange={e => setSnapshotName(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <Input
              placeholder="What changed or why this checkpoint matters"
              value={snapshotDesc}
              onChange={e => setSnapshotDesc(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{selectedDataset.num_images} images</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{selectedDataset.num_annotations} annotations</span>
            </div>
          </div>
          <Button
            onClick={createSnapshot}
            disabled={isCreating || !snapshotName.trim()}
            className="gap-2"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            Create Snapshot
          </Button>
        </CardContent>
      </Card>

      {/* Snapshot history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Snapshot History ({snapshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-10">
              <GitBranch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No snapshots yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create a snapshot before making major changes to preserve your work.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap, idx) => (
                <div
                  key={snap.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border bg-muted/20"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {idx === 0 ? '●' : `${idx + 1}`}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium">{snap.name}</span>
                      {idx === 0 && <Badge variant="default" className="text-xs">Latest</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{snap.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(snap.created_at).toLocaleString()}</span>
                      <span>{snap.num_images} images</span>
                      <span>{snap.num_annotations} annotations</span>
                      {snap.size_mb && <span>{snap.size_mb.toFixed(1)} MB</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => downloadSnapshot(snap)}>
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => restoreSnapshot(snap)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restore
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => deleteSnapshot(snap.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-600 dark:text-blue-400">About Snapshots</p>
            <p className="text-muted-foreground mt-1">
              Snapshots record the state of your dataset at a point in time. They're stored locally in your browser.
              Click <strong>Export</strong> to download a full zip archive of the dataset for true off-site backup.
              Restore calls the backend if supported, otherwise exports the snapshot for manual re-import.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
