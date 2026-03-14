const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    // Project Identity (auto-generated in pre-save hook)
    projectId: {
      type: String,
      unique: true,
    },
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // Submitted by
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Location Data (GPS)
    location: {
      latitude: {
        type: Number,
        required: [true, 'Latitude is required'],
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: [true, 'Longitude is required'],
        min: -180,
        max: 180,
      },
      accuracy: { type: Number }, // GPS accuracy in meters
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      village: { type: String, trim: true },
      coastalZone: { type: String, trim: true },
    },

    // Restoration Details
    restoration: {
      areaHectares: {
        type: Number,
        required: [true, 'Area in hectares is required'],
        min: [0.01, 'Area must be at least 0.01 hectares'],
      },
      species: [
        {
          name: { type: String, trim: true },
          count: { type: Number, min: 0 },
        },
      ],
      ecosystemType: {
        type: String,
        enum: ['mangrove', 'seagrass', 'salt_marsh', 'coastal_wetland', 'other'],
        default: 'mangrove',
      },
      plantingDate: { type: Date },
      survivalRate: { type: Number, min: 0, max: 100 },
    },

    // Carbon Calculation
    carbon: {
      estimatedCO2e: {
        type: Number, // in tons
        default: 0,
      },
      sequestrationRate: {
        type: Number, // tons per hectare per year
        default: 15, // Default: 15 tons CO2e/ha for mangroves
      },
      methodology: {
        type: String,
        default: 'IPCC Tier 1 - Default Factor',
      },
    },

    // Photos & Evidence
    photos: [
      {
        filename: { type: String },
        originalName: { type: String },
        ipfsHash: { type: String },
        ipfsUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        photoType: {
          type: String,
          enum: ['site_before', 'site_after', 'plantation', 'species', 'gps_proof', 'other'],
          default: 'plantation',
        },
        // AI analysis result stored at submission time
        aiAnalysis: {
          plantName: { type: String },
          plantType: { type: String },
          carbonCapability: { type: String },
          sequestrationPercentage: { type: Number },
          confidence: { type: Number },
          reasons: [{ type: String }],
          ecosystemBenefit: { type: String },
          mock: { type: Boolean, default: false },
          analyzedAt: { type: Date },
        },
      },
    ],

    // Status Workflow
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'MINTED'],
      default: 'DRAFT',
    },
    statusHistory: [
      {
        status: { type: String },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        remarks: { type: String },
      },
    ],

    // Verification
    verification: {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      verificationNotes: { type: String },
      aiPhotoScore: { type: Number, min: 0, max: 100 }, // AI-based authenticity score
    },

    // Blockchain (for future steps)
    blockchain: {
      txHash: { type: String },
      tokenId: { type: String },
      creditsMinted: { type: Number, default: 0 },
      mintedAt: { type: Date },
      contractAddress: { type: String },
    },

    // Offline sync flag
    isOfflineSubmission: { type: Boolean, default: false },
    syncedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Auto-generate projectId before saving
projectSchema.pre('save', async function (next) {
  if (!this.projectId) {
    const count = await mongoose.model('Project').countDocuments();
    const timestamp = Date.now().toString(36).toUpperCase();
    this.projectId = `BCR-${String(count + 1).padStart(5, '0')}-${timestamp}`;
  }

  // Auto-calculate CO2e whenever area or sequestration rate is present
  if (this.restoration.areaHectares && this.carbon.sequestrationRate) {
    this.carbon.estimatedCO2e = parseFloat(
      (this.restoration.areaHectares * this.carbon.sequestrationRate).toFixed(2)
    );
  }

  next();
});

// Index for efficient queries
projectSchema.index({ submittedBy: 1, status: 1 });
projectSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('Project', projectSchema);
