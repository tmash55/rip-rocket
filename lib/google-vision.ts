// Google Vision API integration for card OCR
// This will extract text from card images for automated data entry

export interface OCRResult {
  fullText: string
  confidence: number
  textAnnotations: TextAnnotation[]
  cardData: ExtractedCardData
}

export interface TextAnnotation {
  text: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ExtractedCardData {
  playerName?: string
  year?: number
  brand?: string
  setName?: string
  cardNumber?: string
  team?: string
  sport?: string
  confidence: number
  needsReview: boolean
}

export class GoogleVisionOCR {
  private static readonly API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'
  
  /**
   * Get OAuth2 access token using service account credentials
   */
  static async getAccessToken(): Promise<string> {
    try {
      // Create JWT for service account authentication
      const now = Math.floor(Date.now() / 1000)
      const jwt = require('jsonwebtoken')
      
      const payload = {
        iss: process.env.GOOGLE_CLIENT_EMAIL,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, // 1 hour
        iat: now
      }

      // Create private key from environment variable
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
        throw new Error('Missing Google service account credentials')
      }

      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: token,
        }),
      })

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.access_token

    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`)
    }
  }
  
  /**
   * Extract text from card image using Google Vision API
   */
  static async extractCardData(imageUrl: string): Promise<OCRResult> {
    try {
      // Get access token for authentication
      const accessToken = await this.getAccessToken()
      
      // Convert image to base64 (Google Vision requirement)
      const base64Image = await this.imageToBase64(imageUrl)
      
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 50
              }
            ]
          }
        ]
      }

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.responses[0].error) {
        throw new Error(`Vision API error: ${data.responses[0].error.message}`)
      }

      // Process the OCR results
      const textAnnotations = data.responses[0].textAnnotations || []
      const fullText = textAnnotations[0]?.description || ''
      
      return {
        fullText,
        confidence: this.calculateOverallConfidence(textAnnotations),
        textAnnotations: this.processTextAnnotations(textAnnotations),
        cardData: this.extractCardInformation(fullText, textAnnotations)
      }

    } catch (error) {
      console.error('OCR processing failed:', error)
      throw new Error(`OCR failed: ${error.message}`)
    }
  }

  /**
   * Convert image URL to base64 for Google Vision
   */
  private static async imageToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return base64
    } catch (error) {
      throw new Error(`Image conversion failed: ${error.message}`)
    }
  }

  /**
   * Extract structured card data from OCR text
   */
  private static extractCardInformation(fullText: string, annotations: any[]): ExtractedCardData {
    const text = (fullText || '').toUpperCase()
    const lines = (fullText || '').split('\n').filter(line => line.trim())
    
    let cardData: ExtractedCardData = {
      confidence: 0,
      needsReview: true
    }

    try {
      // Extract year (4-digit number, typically 1980-2030)
      const yearMatch = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/)
      if (yearMatch) {
        cardData.year = parseInt(yearMatch[1])
      }

      // Extract card number (various formats: #123, 123, RC-5, etc.)
      const cardNumberPatterns = [
        /\b#?(\d+[A-Z]*)\b/,           // #123, 123A
        /\b([A-Z]{1,3}-?\d+)\b/,      // RC-5, SP1
        /\b(\d+\/\d+)\b/              // 123/299 (serial numbered)
      ]
      
      for (const pattern of cardNumberPatterns) {
        const match = text.match(pattern)
        if (match) {
          cardData.cardNumber = match[1]
          break
        }
      }

      // Extract common sports card brands
      const brands = [
        'TOPPS', 'PANINI', 'UPPER DECK', 'FLEER', 'DONRUSS', 'BOWMAN',
        'LEAF', 'SCORE', 'PACIFIC', 'PINNACLE', 'SKYBOX', 'STADIUM CLUB'
      ]
      
      for (const brand of brands) {
        if (text.includes(brand)) {
          cardData.brand = brand
          break
        }
      }

      // Extract player name (first few meaningful words, excluding brand/year)
      const potentialNames = lines.filter(line => {
        const upperLine = line.toUpperCase()
        return (
          line.length > 2 &&
          line.length < 30 &&
          !brands.some(brand => upperLine.includes(brand)) &&
          !upperLine.match(/\b(19[8-9]\d|20[0-3]\d)\b/) &&
          !upperLine.match(/^#?\d+/) &&
          upperLine.match(/[A-Z\s]+/)
        )
      })

      if (potentialNames.length > 0) {
        cardData.playerName = potentialNames[0].trim()
      }

      // Calculate confidence based on extracted data
      let confidence = 0
      if (cardData.playerName) confidence += 0.3
      if (cardData.year) confidence += 0.2
      if (cardData.brand) confidence += 0.2
      if (cardData.cardNumber) confidence += 0.3

      cardData.confidence = confidence
      cardData.needsReview = confidence < 0.7

      return cardData

    } catch (error) {
      console.error('Card data extraction failed:', error)
      return {
        confidence: 0,
        needsReview: true
      }
    }
  }

  /**
   * Process raw text annotations into structured format
   */
  private static processTextAnnotations(annotations: any[]): TextAnnotation[] {
    return (annotations || []).slice(1).map(annotation => ({
      text: annotation.description,
      confidence: annotation.confidence || 0,
      boundingBox: {
        x: annotation.boundingPoly?.vertices[0]?.x || 0,
        y: annotation.boundingPoly?.vertices[0]?.y || 0,
        width: (annotation.boundingPoly?.vertices[2]?.x || 0) - (annotation.boundingPoly?.vertices[0]?.x || 0),
        height: (annotation.boundingPoly?.vertices[2]?.y || 0) - (annotation.boundingPoly?.vertices[0]?.y || 0)
      }
    }))
  }

  /**
   * Calculate overall confidence score from all annotations
   */
  private static calculateOverallConfidence(annotations: any[]): number {
    if (!annotations || annotations.length === 0) return 0
    
    const confidences = annotations
      .slice(1) // Skip the full text annotation
      .map(annotation => annotation.confidence || 0)
      .filter(conf => conf > 0)
    
    if (confidences.length === 0) return 0
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  }
}

