import { NextResponse } from "next/server"
import { generateSecurityToken } from "@/lib/security-token"

/**
 * API route to generate and return a security token
 * This token must be included in all Server Action calls
 */
export async function GET() {
  try {
    const token = await generateSecurityToken()
    
    // Return token in response (client will store it)
    return NextResponse.json({ 
      success: true,
      token: token 
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (error) {
    console.error("❌ Error generating security token:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate token" },
      { status: 500 }
    )
  }
}

