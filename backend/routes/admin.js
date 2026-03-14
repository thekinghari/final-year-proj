const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { 
  createRegistrySnapshot, 
  getLatestSnapshotHash, 
  autoSyncToIPFS 
} = require('../services/ipfsSync');

/**
 * @route   GET /api/admin/ipfs-hash
 * @desc    Get latest IPFS hash for dashboard data
 * @access  Admin only
 */
router.get('/ipfs-hash', auth, authorize('admin'), async (req, res) => {
  try {
    const snapshot = await getLatestSnapshotHash();
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'No IPFS snapshot found. Please sync data first.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hash: snapshot.ipfsHash,
        url: snapshot.ipfsUrl,
        timestamp: snapshot.timestamp,
        stats: snapshot.stats,
      },
    });
  } catch (error) {
    console.error('Error fetching IPFS hash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve IPFS hash',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/sync-ipfs
 * @desc    Manually trigger IPFS sync
 * @access  Admin only
 */
router.post('/sync-ipfs', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('🔄 Starting IPFS sync...');
    const snapshot = await autoSyncToIPFS();

    if (!snapshot) {
      return res.status(500).json({
        success: false,
        message: 'IPFS sync failed',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registry synced to IPFS successfully',
      data: snapshot,
    });
  } catch (error) {
    console.error('Error syncing to IPFS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync to IPFS',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/projects/:id/approve
 * @desc    Approve a project
 * @access  Admin only
 */
router.post('/projects/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    project.status = 'APPROVED';
    project.approvedBy = req.user.id;
    project.approvedAt = new Date();
    
    await project.save();

    // Auto-sync to IPFS after approval
    console.log('🔄 Auto-syncing to IPFS after approval...');
    autoSyncToIPFS().catch(err => console.error('Auto-sync failed:', err));

    res.status(200).json({
      success: true,
      message: 'Project approved successfully. Syncing to IPFS...',
      data: { project },
    });
  } catch (error) {
    console.error('Error approving project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve project',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/projects/:id/reject
 * @desc    Reject a project
 * @access  Admin only
 */
router.post('/projects/:id/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    const { reason } = req.body;
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    project.status = 'REJECTED';
    project.rejectedBy = req.user.id;
    project.rejectedAt = new Date();
    project.rejectionReason = reason || 'Not specified';
    
    await project.save();

    // Auto-sync to IPFS after rejection
    console.log('🔄 Auto-syncing to IPFS after rejection...');
    autoSyncToIPFS().catch(err => console.error('Auto-sync failed:', err));

    res.status(200).json({
      success: true,
      message: 'Project rejected successfully. Syncing to IPFS...',
      data: { project },
    });
  } catch (error) {
    console.error('Error rejecting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject project',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/admin/projects/:id/send-to-verifier
 * @desc    Send project to review (change status to UNDER_REVIEW)
 * @access  Admin only
 */
router.post('/projects/:id/send-to-verifier', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Change status to UNDER_REVIEW (matches the Project model enum)
    project.status = 'UNDER_REVIEW';
    project.sentToVerifierAt = new Date();
    
    await project.save();

    // Auto-sync to IPFS
    console.log('🔄 Auto-syncing to IPFS...');
    autoSyncToIPFS().catch(err => console.error('Auto-sync failed:', err));

    res.status(200).json({
      success: true,
      message: 'Project sent to review successfully. Syncing to IPFS...',
      data: { project },
    });
  } catch (error) {
    console.error('Error sending project to review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send project to review',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/projects
 * @desc    Get all projects (admin only)
 * @access  Admin only
 */
router.get('/projects', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    const { status, page = 1, limit = 1000 } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status.toUpperCase();
    }

    const projects = await Project.find(filter)
      .populate('submittedBy', 'name email role organization')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    const TOKEN_PRICE_INR = 200;

    const projects = await Project.find({});

    const mintedProjects = projects.filter(p => p.status === 'MINTED');
    const approvedOnlyProjects = projects.filter(p => p.status === 'APPROVED');

    const confirmedCredits = mintedProjects.reduce(
      (sum, p) => sum + (p.blockchain?.creditsMinted || Math.round((p.carbon?.estimatedCO2e || 0) / 0.1)), 0
    );
    const estimatedCredits = approvedOnlyProjects.reduce(
      (sum, p) => sum + Math.round((p.carbon?.estimatedCO2e || 0) / 0.1), 0
    );
    const totalCredits = confirmedCredits + estimatedCredits;

    const stats = {
      totalProjects: projects.length,
      pendingProjects: projects.filter(p => p.status === 'SUBMITTED' || p.status === 'DRAFT').length,
      reviewProjects: projects.filter(p => p.status === 'UNDER_REVIEW' || p.status === 'REVIEW').length,
      approvedProjects: projects.filter(p => p.status === 'APPROVED' || p.status === 'MINTED').length,
      rejectedProjects: projects.filter(p => p.status === 'REJECTED').length,
      totalArea: projects.reduce((sum, p) => sum + (p.restoration?.areaHectares || 0), 0),
      totalCarbon: projects.reduce((sum, p) => sum + (p.carbon?.estimatedCO2e || 0), 0),
      confirmedCredits,
      estimatedCredits,
      totalCredits,
      mintedProjectsCount: mintedProjects.length,
      totalEarnings: totalCredits * TOKEN_PRICE_INR,
    };

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve statistics', error: error.message });
  }
});

/**
 * @route   POST /api/admin/projects/:id/mint
 * @desc    Record blockchain mint after admin mints credits via MetaMask
 * @access  Admin only
 * @body    { txHash, tokenAmount, blockNumber, contractAddress, recipientWallet }
 */
router.post('/projects/:id/mint', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    const User = require('../models/User');
    const { txHash, tokenAmount, blockNumber, contractAddress, recipientWallet } = req.body;

    if (!txHash || !tokenAmount) {
      return res.status(400).json({ success: false, message: 'txHash and tokenAmount are required' });
    }

    const project = await Project.findById(req.params.id).populate('submittedBy');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Project must be APPROVED before minting' });
    }

    // Use server-side calculation as authoritative value (0.1 tons = 1 token)
    const calculatedTokens = Math.round((project.carbon?.estimatedCO2e || 0) / 0.1);
    const finalTokenAmount = calculatedTokens || parseInt(tokenAmount);

    // Update project blockchain fields and status
    project.status = 'MINTED';
    project.blockchain = {
      txHash,
      tokenId: project.projectId,
      creditsMinted: finalTokenAmount,
      mintedAt: new Date(),
      contractAddress: contractAddress || '',
    };

    // Save wallet address on user if provided
    if (recipientWallet && project.submittedBy) {
      await User.findByIdAndUpdate(project.submittedBy._id, {
        walletAddress: recipientWallet,
      });
    }

    await project.save();

    // Auto-sync to IPFS
    autoSyncToIPFS().catch((err) => console.error('Auto-sync failed:', err));

    res.status(200).json({
      success: true,
      message: `Carbon credits minted: ${finalTokenAmount} BCC tokens`,
      data: {
        projectId: project.projectId,
        creditsMinted: finalTokenAmount,
        txHash,
        blockNumber,
        status: 'MINTED',
      },
    });
  } catch (error) {
    console.error('Error recording mint:', error);
    res.status(500).json({ success: false, message: 'Failed to record mint', error: error.message });
  }
});

/**
 * @route   GET /api/admin/carbon-credits
 * @desc    Get total carbon credits minted across all projects
 * @access  Admin only
 */
router.get('/carbon-credits', auth, authorize('admin'), async (req, res) => {
  try {
    const Project = require('../models/Project');
    const mintedProjects = await Project.find({ status: 'MINTED' })
      .populate('submittedBy', 'name email')
      .select('projectId projectName blockchain restoration.areaHectares carbon.estimatedCO2e submittedBy');

    const totalCredits = mintedProjects.reduce((sum, p) => sum + (p.blockchain?.creditsMinted || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalCredits,
        mintedProjectsCount: mintedProjects.length,
        projects: mintedProjects.map((p) => ({
          projectId: p.projectId,
          projectName: p.projectName,
          credits: p.blockchain?.creditsMinted || 0,
          txHash: p.blockchain?.txHash,
          mintedAt: p.blockchain?.mintedAt,
          submittedBy: p.submittedBy?.name,
          areaHectares: p.restoration?.areaHectares,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch carbon credits', error: error.message });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin only)
 * @access  Admin only
 */
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
});

module.exports = router;
