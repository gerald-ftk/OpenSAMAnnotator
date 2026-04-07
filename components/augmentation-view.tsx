'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Wand2, 
  RefreshCcw, 
  ImagePlus, 
  Contrast, 
  Maximize2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Droplets,
  Palette,
  Play,
  Square,
  Eye,
  SunDim,
  Shuffle,
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/app/page'

interface AugmentationViewProps {
  selectedDataset: Dataset | null
  datasets: Dataset[]
  setDatasets: (datasets: Dataset[]) => void
  apiUrl: string
}

interface AugmentationConfig {
  // Geometric transforms
  horizontalFlip: boolean
  horizontalFlipProb: number
  verticalFlip: boolean
  verticalFlipProb: number
  rotate90: boolean
  rotate90Prob: number
  randomRotate: boolean
  rotateLimit: number
  randomCrop: boolean
  cropScale: [number, number]
  resize: boolean
  resizeWidth: number
  resizeHeight: number
  
  // Color transforms
  brightness: boolean
  brightnessLimit: number
  contrast: boolean
  contrastLimit: number
  saturation: boolean
  saturationLimit: number
  hue: boolean
  hueLimit: number
  blur: boolean
  blurLimit: number
  noise: boolean
  noiseVar: number
  
  // Advanced
  mosaic: boolean
  mosaicProb: number
  mixup: boolean
  mixupAlpha: number
  cutout: boolean
  cutoutSize: number
}

const defaultConfig: AugmentationConfig = {
  horizontalFlip: true,
  horizontalFlipProb: 0.5,
  verticalFlip: false,
  verticalFlipProb: 0.5,
  rotate90: false,
  rotate90Prob: 0.5,
  randomRotate: true,
  rotateLimit: 15,
  randomCrop: false,
  cropScale: [0.8, 1.0],
  resize: true,
  resizeWidth: 640,
  resizeHeight: 640,
  brightness: true,
  brightnessLimit: 0.2,
  contrast: true,
  contrastLimit: 0.2,
  saturation: true,
  saturationLimit: 0.2,
  hue: false,
  hueLimit: 0.1,
  blur: true,
  blurLimit: 3,
  noise: false,
  noiseVar: 0.1,
  mosaic: false,
  mosaicProb: 0.5,
  mixup: false,
  mixupAlpha: 0.5,
  cutout: false,
  cutoutSize: 32
}

export function AugmentationView({ 
  selectedDataset, 
  datasets,
  setDatasets,
  apiUrl 
}: AugmentationViewProps) {
  const [config, setConfig] = useState<AugmentationConfig>(defaultConfig)
  const [augmentFactor, setAugmentFactor] = useState(2)
  const [outputName, setOutputName] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isAugmenting, setIsAugmenting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (selectedDataset) {
      setOutputName(`${selectedDataset.name}_augmented`)
    }
  }, [selectedDataset])

  const updateConfig = <K extends keyof AugmentationConfig>(
    key: K, 
    value: AugmentationConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handlePreview = async () => {
    if (!selectedDataset) return
    setPreviewLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/augment/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          config
        })
      })
      if (response.ok) {
        const data = await response.json()
        setPreviewImage(data.preview_url)
      }
    } catch (err) {
      console.error('Preview failed:', err)
    }
    setPreviewLoading(false)
  }

  const handleAugment = async () => {
    if (!selectedDataset) return
    setIsAugmenting(true)
    setProgress(0)
    setMessage(null)

    try {
      const response = await fetch(`${apiUrl}/api/augment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          config,
          augment_factor: augmentFactor,
          output_name: outputName || `${selectedDataset.name}_augmented`
        })
      })

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90))
      }, 500)

      if (response.ok) {
        clearInterval(progressInterval)
        setProgress(100)
        const data = await response.json()
        if (data.new_dataset) {
          setDatasets([...datasets, data.new_dataset])
        }
        setMessage({ 
          type: 'success', 
          text: `Created augmented dataset with ${data.total_images} images` 
        })
      } else {
        clearInterval(progressInterval)
        throw new Error('Augmentation failed')
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Augmentation failed' })
    }
    setIsAugmenting(false)
  }

  const presetConfigs = {
    light: {
      ...defaultConfig,
      horizontalFlip: true,
      randomRotate: true,
      rotateLimit: 10,
      brightness: true,
      brightnessLimit: 0.15,
      contrast: true,
      contrastLimit: 0.15
    },
    medium: {
      ...defaultConfig,
      horizontalFlip: true,
      verticalFlip: true,
      randomRotate: true,
      rotateLimit: 20,
      brightness: true,
      brightnessLimit: 0.25,
      contrast: true,
      contrastLimit: 0.25,
      saturation: true,
      blur: true
    },
    heavy: {
      ...defaultConfig,
      horizontalFlip: true,
      verticalFlip: true,
      rotate90: true,
      randomRotate: true,
      rotateLimit: 30,
      randomCrop: true,
      brightness: true,
      brightnessLimit: 0.3,
      contrast: true,
      contrastLimit: 0.3,
      saturation: true,
      hue: true,
      blur: true,
      noise: true,
      mosaic: true,
      cutout: true
    }
  }

  if (!selectedDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Wand2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">No Dataset Selected</h2>
        <p className="text-muted-foreground max-w-md">
          Select a dataset to configure and apply augmentations
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Data Augmentation</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure and apply augmentations to {selectedDataset.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handlePreview}
            disabled={previewLoading}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            onClick={handleAugment}
            disabled={isAugmenting}
          >
            {isAugmenting ? (
              <>
                <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                Augmenting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Augmentation
              </>
            )}
          </Button>
        </div>
      </div>

      {isAugmenting && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress} className="flex-1" />
              <span className="text-sm text-muted-foreground w-12">{progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div className={cn(
          'mb-4 p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
        )}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Quick Presets:</span>
            <Button variant="outline" size="sm" onClick={() => setConfig(presetConfigs.light)}>
              Light
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfig(presetConfigs.medium)}>
              Medium
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfig(presetConfigs.heavy)}>
              Heavy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfig(defaultConfig)}>
              <RefreshCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          <Tabs defaultValue="geometric" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="geometric">Geometric</TabsTrigger>
              <TabsTrigger value="color">Color & Noise</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
            </TabsList>

            <TabsContent value="geometric" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlipHorizontal className="w-4 h-4" />
                    Flip Transforms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlipHorizontal className="w-4 h-4 text-muted-foreground" />
                      <Label>Horizontal Flip</Label>
                    </div>
                    <Switch 
                      checked={config.horizontalFlip}
                      onCheckedChange={(v) => updateConfig('horizontalFlip', v)}
                    />
                  </div>
                  {config.horizontalFlip && (
                    <div className="pl-6 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Probability</span>
                        <span className="text-muted-foreground">{config.horizontalFlipProb}</span>
                      </div>
                      <Slider
                        value={[config.horizontalFlipProb]}
                        onValueChange={([v]) => updateConfig('horizontalFlipProb', v)}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlipVertical className="w-4 h-4 text-muted-foreground" />
                      <Label>Vertical Flip</Label>
                    </div>
                    <Switch 
                      checked={config.verticalFlip}
                      onCheckedChange={(v) => updateConfig('verticalFlip', v)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCw className="w-4 h-4" />
                    Rotation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>90° Rotation</Label>
                    <Switch 
                      checked={config.rotate90}
                      onCheckedChange={(v) => updateConfig('rotate90', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Random Rotation</Label>
                    <Switch 
                      checked={config.randomRotate}
                      onCheckedChange={(v) => updateConfig('randomRotate', v)}
                    />
                  </div>
                  {config.randomRotate && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Max Angle</span>
                        <span className="text-muted-foreground">±{config.rotateLimit}°</span>
                      </div>
                      <Slider
                        value={[config.rotateLimit]}
                        onValueChange={([v]) => updateConfig('rotateLimit', v)}
                        min={0}
                        max={45}
                        step={5}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Maximize2 className="w-4 h-4" />
                    Scale & Crop
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crop className="w-4 h-4 text-muted-foreground" />
                      <Label>Random Crop</Label>
                    </div>
                    <Switch 
                      checked={config.randomCrop}
                      onCheckedChange={(v) => updateConfig('randomCrop', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Resize</Label>
                    <Switch 
                      checked={config.resize}
                      onCheckedChange={(v) => updateConfig('resize', v)}
                    />
                  </div>
                  {config.resize && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label className="text-xs">Width</Label>
                        <Input 
                          type="number"
                          value={config.resizeWidth}
                          onChange={(e) => updateConfig('resizeWidth', parseInt(e.target.value) || 640)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Height</Label>
                        <Input 
                          type="number"
                          value={config.resizeHeight}
                          onChange={(e) => updateConfig('resizeHeight', parseInt(e.target.value) || 640)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="color" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SunDim className="w-4 h-4" />
                    Brightness & Contrast
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Brightness</Label>
                    <Switch 
                      checked={config.brightness}
                      onCheckedChange={(v) => updateConfig('brightness', v)}
                    />
                  </div>
                  {config.brightness && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between text-sm">
                        <span>Limit</span>
                        <span className="text-muted-foreground">±{(config.brightnessLimit * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[config.brightnessLimit]}
                        onValueChange={([v]) => updateConfig('brightnessLimit', v)}
                        min={0}
                        max={0.5}
                        step={0.05}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Contrast className="w-4 h-4 text-muted-foreground" />
                      <Label>Contrast</Label>
                    </div>
                    <Switch 
                      checked={config.contrast}
                      onCheckedChange={(v) => updateConfig('contrast', v)}
                    />
                  </div>
                  {config.contrast && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between text-sm">
                        <span>Limit</span>
                        <span className="text-muted-foreground">±{(config.contrastLimit * 100).toFixed(0)}%</span>
                      </div>
                      <Slider
                        value={[config.contrastLimit]}
                        onValueChange={([v]) => updateConfig('contrastLimit', v)}
                        min={0}
                        max={0.5}
                        step={0.05}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color Adjustments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Saturation</Label>
                    <Switch 
                      checked={config.saturation}
                      onCheckedChange={(v) => updateConfig('saturation', v)}
                    />
                  </div>
                  {config.saturation && (
                    <div className="space-y-2 pl-6">
                      <Slider
                        value={[config.saturationLimit]}
                        onValueChange={([v]) => updateConfig('saturationLimit', v)}
                        min={0}
                        max={0.5}
                        step={0.05}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label>Hue Shift</Label>
                    <Switch 
                      checked={config.hue}
                      onCheckedChange={(v) => updateConfig('hue', v)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Blur & Noise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Gaussian Blur</Label>
                    <Switch 
                      checked={config.blur}
                      onCheckedChange={(v) => updateConfig('blur', v)}
                    />
                  </div>
                  {config.blur && (
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between text-sm">
                        <span>Kernel Size</span>
                        <span className="text-muted-foreground">{config.blurLimit}px</span>
                      </div>
                      <Slider
                        value={[config.blurLimit]}
                        onValueChange={([v]) => updateConfig('blurLimit', v)}
                        min={1}
                        max={7}
                        step={2}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label>Gaussian Noise</Label>
                    <Switch 
                      checked={config.noise}
                      onCheckedChange={(v) => updateConfig('noise', v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Mosaic & Mixup
                  </CardTitle>
                  <CardDescription>
                    Advanced augmentations that combine multiple images
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mosaic</Label>
                      <p className="text-xs text-muted-foreground">Combine 4 images into a grid</p>
                    </div>
                    <Switch 
                      checked={config.mosaic}
                      onCheckedChange={(v) => updateConfig('mosaic', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mixup</Label>
                      <p className="text-xs text-muted-foreground">Blend two images together</p>
                    </div>
                    <Switch 
                      checked={config.mixup}
                      onCheckedChange={(v) => updateConfig('mixup', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Cutout</Label>
                      <p className="text-xs text-muted-foreground">Random rectangular occlusion</p>
                    </div>
                    <Switch 
                      checked={config.cutout}
                      onCheckedChange={(v) => updateConfig('cutout', v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="output" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Output Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Output Dataset Name</Label>
                    <Input 
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      placeholder="Augmented dataset name"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Augmentation Factor</Label>
                      <span className="text-sm text-muted-foreground">{augmentFactor}x</span>
                    </div>
                    <Slider
                      value={[augmentFactor]}
                      onValueChange={([v]) => setAugmentFactor(v)}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Each image will generate {augmentFactor} augmented versions.
                      Total output: ~{selectedDataset.num_images * augmentFactor} images
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Card className="w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>See how augmentations will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {previewLoading ? (
                <RefreshCcw className="w-8 h-8 text-muted-foreground animate-spin" />
              ) : previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Augmentation preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-4">
                  <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click Preview to see augmented samples
                  </p>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={handlePreview}
              disabled={previewLoading}
            >
              <RefreshCcw className={cn("w-4 h-4 mr-2", previewLoading && "animate-spin")} />
              Generate Preview
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
