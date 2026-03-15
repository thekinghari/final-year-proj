const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

    const prompt = `You are an expert botanist and carbon sequestration scientist. Analyze the plant/vegetation in this image.

TASK: Identify the species and assess its carbon sequestration capability.

STRICT RULES:
- sequestrationPercentage MUST be an integer between 0 and 100. Never output 101, 120, 150, or any value above 100.
- carbonCapability MUST match the percentage using these exact bands:
  * "Low"       → sequestrationPercentage: 5 to 30
  * "Medium"    → sequestrationPercentage: 31 to 60
  * "High"      → sequestrationPercentage: 61 to 85
  * "Very High" → sequestrationPercentage: 86 to 100
- confidence MUST be between 0 and 100.

REFERENCE VALUES (use these as anchors):
- Lawn grass / shrubs → Low, ~15%
- Mixed forest / agroforestry → Medium, ~45%
- Teak / bamboo / dense forest → High, ~75%
- Mangrove / seagrass / salt marsh → Very High, ~92%

OUTPUT: Respond with ONLY a raw JSON object. No markdown, no code fences, no explanation.

{
  "plantName": "<exact species name>",
  "plantType": "<vegetation category>",
  "carbonCapability": "<Low|Medium|High|Very High>",
  "sequestrationPercentage": <integer 0-100>,
  "confidence": <integer 0-100>,
  "reasons": ["<species-specific reason 1>", "<reason 2>", "<reason 3>"],
  "ecosystemBenefit": "<one sentence about this species unique benefit>"
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
      return res.json({
        success: true,
        mock: true,
        data: getMockAnalysis('Unable to parse AI response. Showing estimated data.'),
      });
    }

    // Sanitize: enforce 0–100 range and ensure capability matches percentage
    analysis = sanitizeAnalysis(analysis);

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

/**
 * Sanitize AI response — enforce 0–100 range and derive capability from percentage
 * so even if the model ignores the prompt constraint, the output is always valid.
 */
function sanitizeAnalysis(data) {
  // Clamp percentage strictly to 0–100
  let pct = Math.round(Number(data.sequestrationPercentage) || 0);
  pct = Math.max(0, Math.min(100, pct));

  // If the model returned >100, scale it down proportionally (e.g. 150 → 100, 120 → 85)
  // This handles the case where the model used the old 0–200 scale
  if (Number(data.sequestrationPercentage) > 100) {
    pct = Math.round(Math.min((Number(data.sequestrationPercentage) / 200) * 100, 100));
  }

  // Derive capability from the clamped percentage — don't trust the model's label
  let carbonCapability;
  if (pct <= 30)       carbonCapability = 'Low';
  else if (pct <= 60)  carbonCapability = 'Medium';
  else if (pct <= 85)  carbonCapability = 'High';
  else                 carbonCapability = 'Very High';

  const confidence = Math.max(0, Math.min(100, Math.round(Number(data.confidence) || 60)));

  return {
    plantName: data.plantName || 'Unknown species',
    plantType: data.plantType || 'Vegetation',
    carbonCapability,
    sequestrationPercentage: pct,
    confidence,
    reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 3) : [],
    ecosystemBenefit: data.ecosystemBenefit || '',
  };
}

function getMockAnalysis(note = null) {
  const species = [
    {
      plantName: 'Avicennia marina (Grey Mangrove)',
      plantType: 'Mangrove',
      carbonCapability: 'Very High',
      sequestrationPercentage: 94,
      confidence: 72,
      reasons: [
        'Pneumatophore root systems trap and store organic carbon in anaerobic sediments',
        'Blue carbon storage in waterlogged soils persists for centuries',
        'High above-ground and below-ground biomass accumulation rate',
      ],
      ecosystemBenefit: 'Mangroves sequester up to 10x more carbon per hectare than tropical rainforests.',
    },
    {
      plantName: 'Tectona grandis (Teak)',
      plantType: 'Tropical Hardwood Forest',
      carbonCapability: 'High',
      sequestrationPercentage: 75,
      confidence: 68,
      reasons: [
        'Dense hardwood timber locks carbon in long-lived biomass',
        'Deep root systems store significant below-ground carbon',
        'Slow decomposition rate of leaf litter increases soil carbon',
      ],
      ecosystemBenefit: 'Teak plantations provide sustained carbon storage over 50–80 year rotation cycles.',
    },
    {
      plantName: 'Bambusa vulgaris (Common Bamboo)',
      plantType: 'Bamboo Plantation',
      carbonCapability: 'High',
      sequestrationPercentage: 80,
      confidence: 70,
      reasons: [
        'Fastest-growing woody plant — sequesters carbon at exceptional rates',
        'Extensive rhizome network stores carbon in soil year-round',
        'Harvested culms lock carbon in durable products for decades',
      ],
      ecosystemBenefit: 'Bamboo can sequester up to 12 tonnes of CO₂ per hectare annually.',
    },
    {
      plantName: 'Halophila ovalis (Seagrass)',
      plantType: 'Seagrass Meadow',
      carbonCapability: 'Very High',
      sequestrationPercentage: 91,
      confidence: 65,
      reasons: [
        'Seagrass meadows bury carbon in sediments at rates 35x faster than tropical forests',
        'Continuous organic matter deposition builds long-term carbon sinks',
        'Dense canopy slows water flow, trapping suspended carbon particles',
      ],
      ecosystemBenefit: 'Seagrass covers only 0.1% of ocean floor but stores 10% of all ocean carbon.',
    },
    {
      plantName: 'Casuarina equisetifolia (Coastal Sheoak)',
      plantType: 'Coastal Plantation',
      carbonCapability: 'Medium',
      sequestrationPercentage: 48,
      confidence: 63,
      reasons: [
        'Nitrogen-fixing root nodules improve soil carbon through organic matter',
        'Dense needle litter creates a carbon-rich humus layer',
        'Wind-resistant structure allows sustained growth in coastal conditions',
      ],
      ecosystemBenefit: 'Coastal plantations stabilize shorelines while building soil carbon reserves.',
    },
  ];

  const idx = new Date().getMinutes() % species.length;
  return { ...species[idx], note, mock: true };
}

module.exports = router;
