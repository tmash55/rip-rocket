import { NextRequest, NextResponse } from "next/server"
import { GoogleVisionOCR } from "@/lib/google-vision"

export async function GET() {
  try {
    // Test with a simple base64 image or test URL
    console.log('[Test OCR] Testing Google Vision API credentials...')
    
    // First, let's just test the token generation
    console.log('[Test OCR] Testing access token generation...')
    
    // Check environment variables
    const requiredVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY']
    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Missing environment variables",
        missing: missingVars
      }, { status: 400 })
    }

    console.log('[Test OCR] Environment variables look good')
    console.log('[Test OCR] Client email:', process.env.GOOGLE_CLIENT_EMAIL)
    console.log('[Test OCR] Private key present:', !!process.env.GOOGLE_PRIVATE_KEY)

    // Test the token generation
    try {
      const accessToken = await GoogleVisionOCR.getAccessToken()
      console.log('[Test OCR] ✅ Successfully generated access token')
      
      return NextResponse.json({
        success: true,
        message: "Google Vision API credentials are working",
        token_generated: true,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        token_length: accessToken.length
      })
    } catch (tokenError) {
      console.error('[Test OCR] ❌ Token generation failed:', tokenError)
      
      return NextResponse.json({
        success: false,
        error: "Failed to generate access token",
        detail: tokenError.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Test OCR] Test failed:', error)
    return NextResponse.json({
      success: false,
      error: "OCR test failed",
      detail: error.message
    }, { status: 500 })
  }
}
