// This API route acts as a proxy to the Python backend
// In production, the Python backend runs separately on port 8000

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || ""
  
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Please ensure the Python backend is running." },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || ""
  
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Backend unavailable. Please ensure the Python backend is running." },
      { status: 503 }
    )
  }
}
