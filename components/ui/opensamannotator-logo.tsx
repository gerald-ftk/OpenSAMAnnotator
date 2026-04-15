"use client"

import { useEffect, useState } from "react"

interface OpenSAMAnnotatorLogoProps {
  size?: number
  showText?: boolean
}

export function OpenSAMAnnotatorLogo({ size = 100 }: OpenSAMAnnotatorLogoProps) {
  const [fontLoaded, setFontLoaded] = useState(false)

  useEffect(() => {
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)
    link.onload = () => setFontLoaded(true)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  const fontSize = size * 0.22

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1,
        fontFamily: fontLoaded ? "'Syne', sans-serif" : "system-ui, sans-serif",
        fontSize,
        fontWeight: 800,
        letterSpacing: "-0.025em",
      }}
    >
      <span style={{ color: "white" }}>Open</span>
      <span style={{ color: "#00D4B4" }}>SAM</span>
      <span style={{ color: "white" }}>Annotator</span>
    </div>
  )
}
