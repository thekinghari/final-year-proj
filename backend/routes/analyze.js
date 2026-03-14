const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * @route   POST /api/analyze/plant
 * @desc    Analyze a plant image using Gemini Vision AI
 *          Returns plant identification + carbon reduction capability
 * @access  Authenticated users
 * @body    { imageBase64: string, mimeType: string }
 */
router.post('/plant', auth, async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'imageBase64 is required' });
    }

    if (!GEMINI_API_KEY) {
      // Return a mock response when no API key is configured
      return res.json({
        success: true,
        mock: true,
        data: getMockAnalysis(),
      });
    }

    const prompt = `You are an expert botanist and carbon sequestration scientist.
Analyze this plant/vegetation image and provide:
1. Plant/vegetation identification (species name if possible, or type like mangrove, seagrass, etc.)
2. Carbon reduction capability rating (Low / Medium / High / Very High)
3. Estimated carbon sequestration percentage relative to average vegetation (e.g., 85% means it sequesters 85% more than average)
4. Key reasons why this plant helps reduce carbon emissions (2-3 bullet points)
5. Confidence score (0-100) in your identification

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "plantName": "string",
  "plantType": "string",
  "carbonCapability": "Low|Medium|High|Very High",
  "sequestrationPercentage": number,
  "confidence": number,
  "reasons": ["reason1", "reason2", "reason3"],
  "ecosystemBenefit": "string (one sentence)"
}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    };

    const response = await axios.post(GEMINI_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      // Gemini returned non-JSON — parse what we can
      return res.json({
        success: true,
        mock: true,
        data: getMockAnalysis('Unable to parse AI response. Showing estimated data.'),
      });
    }

    return res.json({ success: true, mock: false, data: analysis });
  } catch (error) {
    console.error('Plant analysis error:', error?.response?.data || error.message);

    // Graceful fallback — never crash the user experience
    return res.json({
      success: true,
      mock: true,
      data: getMockAnalysis('AI service temporarily unavailable. Showing estimated data.'),
    });
  }
});

function getMockAnalysis(note = null) {
  return {
    plantName: 'Coastal Vegetation',
    plantType: 'Mangrove / Wetland Species',
    carbonCapability: 'High',
    sequestrationPercentage: 78,
    confidence: 60,
    reasons: [
      'Dense root systems trap organic carbon in sediments',
      'High biomass accumulation rate compared to terrestrial forests',
      'Coastal location enables blue carbon storage in waterlogged soils',
    ],
    ecosystemBenefit: 'Coastal wetland plants sequester up to 10x more carbon per hectare than tropical forests.',
    note,
    mock: true,
  };
}

module.exports = router;
