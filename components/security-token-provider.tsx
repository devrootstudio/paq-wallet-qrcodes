"use client"

import { useEffect } from "react"

/**
 * Client component that initializes the security token on mount
 * This ensures the token cookie is set before any Server Actions are called
 */
export default function SecurityTokenProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize security token by calling the API route
    // This sets the httpOnly cookie that will be used for Server Action validation
    fetch("/api/security-token", {
      method: "GET",
      credentials: "include", // Important: include cookies
      cache: "no-store",
    }).catch((error) => {
      // Silently fail - token generation is not critical for initial render
      console.warn("Failed to initialize security token:", error)
    })
  }, [])

  return <>{children}</>
}

