// OpenAI GPT-4o-mini Vision integration for card OCR + rarity detection
// This replaces Google Vision with a more intelligent approach

export interface AICardAnalysis {
  // Basic card information (OCR)
  player_name: string | null
  year: number | null
  card_number: string | null
  set_name: string | null
  brand: string | null
  sport: string | null
  
  // Rarity and visual analysis
  rarity_type: string | null
  parallel_type: string | null  // Prizm, Refractor, Optic, etc.
  insert_type: string | null    // Preview, Red Zone, etc.
  rarity_indicators: string[]
  is_rookie_card: boolean
  is_autographed: boolean
  is_memorabilia: boolean
  is_numbered: boolean
  serial_number: string | null
  
  // Grading information
  is_graded: boolean
  grading_company: string | null  // PSA, BGS, SGC, etc.
  grade: string | null           // 9, 10, 9.5, etc.
  certification_number: string | null  // The long number on graded cards
  
  // Condition and quality
  condition_notes: string[]
  estimated_condition: string | null
  
  // Confidence and metadata
  extraction_confidence: number
  needs_human_review: boolean
  ai_notes: string
}

export interface AIVisionResult {
  success: boolean
  card_analysis: AICardAnalysis
  raw_response: string
  processing_time_ms: number
  token_usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenAIVisionOCR {
  private static readonly API_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
  
  /**
   * Analyze card image using specified model for OCR + rarity detection
   */
  static async analyzeCard(imageUrl: string, model: string = 'gpt-4o-mini'): Promise<AIVisionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[AI Vision] Starting analysis for image: ${imageUrl}`)
      
      // Check for API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set')
      }
      
      console.log(`[AI Vision] API key found, making request to OpenAI...`)
      
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.getCardAnalysisPrompt()
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'low' // Reduced from 'high' to save ~70% tokens
                  }
                }
              ]
            }
          ],
          max_tokens: 300, // Reduced from 1000 to save costs
          temperature: 0.1 // Low temperature for consistent extraction
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[AI Vision] OpenAI API error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[AI Vision] OpenAI API response received:`, {
        choices: data.choices?.length || 0,
        usage: data.usage,
        model: data.model
      })
      
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        console.error(`[AI Vision] No response content from OpenAI API:`, data)
        throw new Error('No response content from OpenAI API')
      }

      console.log(`[AI Vision] Raw AI response:`, aiResponse)

      // Parse the JSON response
      const cardAnalysis = this.parseAIResponse(aiResponse)
      
      const processingTime = Date.now() - startTime
      console.log(`[AI Vision] Analysis completed in ${processingTime}ms`)

      return {
        success: true,
        card_analysis: cardAnalysis,
        raw_response: aiResponse,
        processing_time_ms: processingTime,
        token_usage: data.usage
      }

    } catch (error) {
      console.error('[AI Vision] Analysis failed:', error)
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        card_analysis: this.getEmptyAnalysis(),
        raw_response: `Error: ${error.message}`,
        processing_time_ms: processingTime
      }
    }
  }

  /**
   * Structured prompt for comprehensive card analysis
   */
  private static getCardAnalysisPrompt(): string {
    return `Extract information from this sports card in JSON format.

CRITICAL EXTRACTION RULES:

YEAR: Find copyright symbol (©) followed by year. For "1992-93" sets, use the copyright year.
Examples: "© 1993 Classic Games" = 1993, "© 1992 Topps" = 1992

SET NAME: Look for product/series name near copyright or brand.
Examples: "Classic Draft Picks", "Topps Stadium Club", "Upper Deck"

CARD NUMBER: Small dedicated card numbers only, usually in corners.
IGNORE: Jersey numbers (#33 on uniform), stat numbers, years

PLAYER NAME: Full name as displayed on card

Return this JSON:
{
  "player_name": "Full Name",
  "year": 1993,
  "card_number": "36", 
  "set_name": "Classic Draft Picks",
  "brand": "Classic",
  "sport": "basketball",
  "rarity_type": "Base",
  "is_rookie_card": false,
  "is_autographed": false,
  "estimated_condition": "Near Mint",
  "extraction_confidence": 0.85,
  "ai_notes": "Brief observations"
}`
  }

  /**
   * Parse AI response into structured card analysis
   */
  private static parseAIResponse(response: string): AICardAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate and structure the response (include grading/parallel fields)
      return {
        player_name: parsed.player_name || null,
        year: parsed.year ? parseInt(parsed.year) : null,
        card_number: parsed.card_number || null,
        set_name: parsed.set_name || null,
        brand: parsed.brand || null,
        sport: parsed.sport || null,
        
        rarity_type: parsed.rarity_type || 'Base',
        parallel_type: parsed.parallel_type || null,
        insert_type: parsed.insert_type || null,
        rarity_indicators: Array.isArray(parsed.rarity_indicators) ? parsed.rarity_indicators : [],
        is_rookie_card: Boolean(parsed.is_rookie_card),
        is_autographed: Boolean(parsed.is_autographed),
        is_memorabilia: Boolean(parsed.is_memorabilia),
        is_numbered: Boolean(parsed.is_numbered),
        serial_number: parsed.serial_number || null,
        
        // Grading
        is_graded: Boolean(parsed.is_graded),
        grading_company: parsed.grading_company || null,
        grade: parsed.grade || null,
        certification_number: parsed.certification_number || null,
        
        condition_notes: Array.isArray(parsed.condition_notes) ? parsed.condition_notes : [],
        estimated_condition: parsed.estimated_condition || null,
        
        extraction_confidence: parsed.extraction_confidence || 0.5,
        needs_human_review: Boolean(parsed.needs_human_review || parsed.extraction_confidence < 0.7),
        ai_notes: parsed.ai_notes || ''
      }

    } catch (error) {
      console.error('[AI Vision] Failed to parse AI response:', error)
      return this.getEmptyAnalysis()
    }
  }

  /**
   * Get empty analysis structure for error cases
   */
  private static getEmptyAnalysis(): AICardAnalysis {
    return {
      player_name: null,
      year: null,
      card_number: null,
      set_name: null,
      brand: null,
      sport: null,
      rarity_type: null,
      parallel_type: null,
      insert_type: null,
      rarity_indicators: [],
      is_rookie_card: false,
      is_autographed: false,
      is_memorabilia: false,
      is_numbered: false,
      serial_number: null,
      is_graded: false,
      grading_company: null,
      grade: null,
      certification_number: null,
      condition_notes: [],
      estimated_condition: null,
      extraction_confidence: 0,
      needs_human_review: true,
      ai_notes: 'Analysis failed - manual review required'
    }
  }

  /**
   * Analyze both front and back images of a card pair together
   */
  static async analyzeCardPair(frontImageUrl: string, backImageUrl: string, model: string = 'gpt-4o-mini'): Promise<AIVisionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[AI Vision] Starting dual-image analysis: front + back`)
      
      // Check for API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set')
      }
      
      console.log(`[AI Vision] API key found, making request to OpenAI with ${model}...`)
      
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.getCardPairAnalysisPrompt()
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: frontImageUrl,
                    detail: 'low'
                  }
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: backImageUrl,
                    detail: 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 400, // Increased for dual-image analysis
          temperature: 0.1
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[AI Vision] OpenAI API error: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[AI Vision] OpenAI API response received:`, {
        choices: data.choices?.length || 0,
        usage: data.usage,
        model: data.model
      })
      
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        console.error(`[AI Vision] No response content from OpenAI API:`, data)
        throw new Error('No response content from OpenAI API')
      }

      console.log(`[AI Vision] Raw AI response:`, aiResponse)

      // Parse the JSON response
      const cardAnalysis = this.parseAIResponse(aiResponse)
      
      const processingTime = Date.now() - startTime
      console.log(`[AI Vision] Dual-image analysis completed in ${processingTime}ms`)

      return {
        success: true,
        card_analysis: cardAnalysis,
        raw_response: aiResponse,
        processing_time_ms: processingTime,
        token_usage: data.usage
      }

    } catch (error) {
      console.error('[AI Vision] Dual-image analysis failed:', error)
      const processingTime = Date.now() - startTime
      
      return {
        success: false,
        card_analysis: this.getEmptyAnalysis(),
        raw_response: `Error: ${error.message}`,
        processing_time_ms: processingTime
      }
    }
  }

  /**
   * Enhanced prompt for analyzing both front and back of card
   */
  private static getCardPairAnalysisPrompt(): string {
    return `Analyze both images of this sports card (front and back) and extract all information in JSON format.

CRITICAL EXTRACTION RULES:

FRONT IMAGE: Usually shows player photo, name, team, position
BACK IMAGE: Usually shows stats, copyright, card number, set details

YEAR: Look for copyright symbol (©) - often on BACK image
Examples: "© 1993 Classic Games" = 1993, "© 2024 Panini" = 2024

SET NAME: Product/series name - check BOTH images
Examples: "Classic Draft Picks", "Donruss Optic", "Prizm"

CARD NUMBER: Small dedicated numbers - often on BACK image corners
IGNORE: Jersey numbers (#33 on uniform), stat numbers, years

PLAYER NAME: Full name as displayed - usually on FRONT

BRAND: Manufacturer - check copyright or logos on BOTH images

GRADING DETECTION (VERY IMPORTANT):
- Look for grading slabs/cases around the card
- PSA slabs: Red label with "PSA" and grade number
- BGS slabs: Different colored labels
- SGC slabs: Black/gold labels
- Certification numbers: Usually 8-11 digit codes on label
- Grade: Numbers like "9", "10", "9.5", "MINT"

PARALLEL/INSERT DETECTION:
- Base: Standard card design
- Prizm: Rainbow/refractor-like effects
- Optic: Geometric holographic patterns  
- Refractor: Chrome-like shine/reflection
- Preview: Special preview subset
- Insert types: Red Zone, Downtown, etc.
- Note any special visual effects

ROOKIE DETECTION:
- Look for "RC", "Rookie", "Rated Rookie" text
- Rookie logos or designations

Combine information from BOTH images for complete analysis.

Return this JSON:
{
  "player_name": "Full Name",
  "year": 2024,
  "card_number": "379", 
  "set_name": "Donruss Optic",
  "brand": "Panini",
  "sport": "football",
  "rarity_type": "Preview",
  "parallel_type": "Blue Scope Prizm",
  "insert_type": "Preview",
  "is_rookie_card": true,
  "is_autographed": false,
  "is_memorabilia": false,
  "is_numbered": false,
  "serial_number": null,
  "is_graded": true,
  "grading_company": "PSA",
  "grade": "9",
  "certification_number": "115206587",
  "estimated_condition": "Mint",
  "extraction_confidence": 0.90,
  "ai_notes": "Graded PSA 9 Optic Preview Blue Scope Prizm rookie card"
}`
  }
}

/**
 * Higher-level AIVision class for card pair analysis
 */
export class AIVision {
  /**
   * Analyze a card pair (front and back images) using AI vision
   */
  static async analyzeCardPair(frontImageUrl: string, backImageUrl: string, model: string = 'gpt-4o-mini'): Promise<AIVisionResult> {
    console.log(`[AIVision] Analyzing card pair (front + back) with model: ${model}`)
    
    try {
      // Analyze both front and back images together
      const result = await OpenAIVisionOCR.analyzeCardPair(frontImageUrl, backImageUrl, model)
      
      return result
      
    } catch (error) {
      console.error('[AIVision] Error analyzing card pair:', error)
      throw error
    }
  }
}
