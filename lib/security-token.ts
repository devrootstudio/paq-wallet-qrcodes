import { cookies } from "next/headers"
import crypto from "crypto"

// Secret key for token generation (should be in environment variable)
const SECRET_KEY = process.env.SECURITY_TOKEN_SECRET || "change-this-secret-key-in-production"
const TOKEN_COOKIE_NAME = "app-security-token"
const TOKEN_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Generates a secure token for client-side requests
 * This token is stored in a httpOnly cookie and must be sent with each request
 */
export async function generateSecurityToken(): Promise<string> {
  // Generate a random token
  const token = crypto.randomBytes(32).toString("hex")
  
  // Create a signed token using HMAC
  const hmac = crypto.createHmac("sha256", SECRET_KEY)
  hmac.update(token)
  const signature = hmac.digest("hex")
  
  // Combine token and signature
  const signedToken = `${token}.${signature}`
  
  // Store in httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  })
  
  return signedToken
}

/**
 * Validates a security token from the request
 * If no token exists, generates one automatically (for first request)
 * @param providedToken - Token provided by the client (optional, will read from cookie if not provided)
 * @returns true if token is valid, false otherwise
 */
export async function validateSecurityToken(providedToken?: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    let cookieToken = cookieStore.get(TOKEN_COOKIE_NAME)?.value
    
    // If no token exists, generate one automatically (for first request)
    if (!cookieToken && !providedToken) {
      console.log("🔐 Security: No token found, generating new token...")
      cookieToken = await generateSecurityToken()
    }
    
    // Use provided token or cookie token
    const tokenToValidate = providedToken || cookieToken
    
    if (!tokenToValidate) {
      console.error("🚫 Security: No security token found")
      return false
    }
    
    // Split token and signature
    const [token, signature] = tokenToValidate.split(".")
    
    if (!token || !signature) {
      console.error("🚫 Security: Invalid token format")
      return false
    }
    
    // Verify signature
    const hmac = crypto.createHmac("sha256", SECRET_KEY)
    hmac.update(token)
    const expectedSignature = hmac.digest("hex")
    
    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
    
    if (!isValid) {
      console.error("🚫 Security: Invalid token signature")
      return false
    }
    
    console.log("✅ Security: Token validated successfully")
    return true
  } catch (error) {
    console.error("❌ Security: Error validating token:", error)
    return false
  }
}

/**
 * Gets the current security token from cookies (for client-side use)
 */
export async function getSecurityToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(TOKEN_COOKIE_NAME)?.value || null
  } catch (error) {
    console.error("❌ Security: Error getting token:", error)
    return null
  }
}

