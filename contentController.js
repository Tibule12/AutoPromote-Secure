const { db, storage } = require('./firebaseAdmin');

// @desc    Create new content
// @route   POST /api/content
// @access  Private
const createContent = async (req, res) => {
  const {
    title,
    type,
    url,
    description,
    articleText,
    target_platforms,
    scheduled_promotion_time,
    promotion_frequency,
    target_rpm,
    min_views_threshold,
    max_budget
  } = req.body;
  const userId = req.userId; // From auth middleware

  try {
    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({ message: 'Title and type are required' });
    }

    // For non-article content, either URL or file must be provided
    if (type !== 'article' && !url && !req.file) {
      return res.status(400).json({
        message: 'For video, image, and audio content, you must provide either a URL or upload a file'
      });
    }

    // For article content, articleText is required
    if (type === 'article' && !articleText) {
      return res.status(400).json({ message: 'Article text is required for article content' });
    }

    let finalUrl = url;

    // Handle file upload if present
    if (req.file) {
      // This would need Firebase Storage integration
      // For now, we'll assume the file URL is provided or handled elsewhere
      finalUrl = url || `uploaded-file-${Date.now()}`;
    }

    // Handle article content
    if (type === 'article' && articleText) {
      // Store article text as base64 encoded data URL
      finalUrl = `data:text/plain;base64,${Buffer.from(articleText).toString('base64')}`;
    }

    // Set default values for optional fields
    const contentData = {
      title,
      type,
      url: finalUrl,
      description: description || '',
      user_id: userId,
      target_platforms: target_platforms || ['youtube', 'tiktok', 'instagram'],
      scheduled_promotion_time: scheduled_promotion_time || null,
      promotion_frequency: promotion_frequency || 'once',
      target_rpm: target_rpm ? Number(target_rpm) : 900000, // Default RPM
      min_views_threshold: min_views_threshold ? Number(min_views_threshold) : 2000000, // Default 2M views
      max_budget: max_budget ? Number(max_budget) : 1000, // Default $1000
      status: 'pending', // All new content must be reviewed by admin
      views: 0,
      clicks: 0,
      revenue: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Additional metadata
      file_metadata: req.file ? {
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_at: new Date().toISOString()
      } : null
    };

    // Filter out undefined values for Firestore
    const filteredContentData = Object.fromEntries(
      Object.entries(contentData).filter(([_, value]) => value !== undefined && value !== null)
    );

    const docRef = await db.collection('content').add(filteredContentData);
    const doc = await docRef.get();

    console.log('Content created successfully:', doc.id);
    res.status(201).json({
      id: doc.id,
      ...doc.data(),
      message: 'Content created successfully'
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all content
// @route   GET /api/content
// @access  Public
const getAllContent = async (req, res) => {
  try {
    const snapshot = await db.collection('content')
      .orderBy('created_at', 'desc')
      .get();
    
    const content = [];
    snapshot.forEach(doc => {
      content.push({ id: doc.id, ...doc.data() });
    });
    res.json(content);
  } catch (error) {
    console.error('Error getting all content:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get content by ID
// @route   GET /api/content/:id
// @access  Public
const getContentById = async (req, res) => {
  try {
    const doc = await db.collection('content').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Increment views
    await doc.ref.update({
      views: (doc.data().views || 0) + 1
    });

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's content
// @route   GET /api/content/my-content
// @access  Private
const getUserContent = async (req, res) => {
  try {
    const snapshot = await db.collection('content')
      .where('user_id', '==', req.userId)
      .orderBy('created_at', 'desc')
      .get();
    
    const content = [];
    snapshot.forEach(doc => {
      content.push({ id: doc.id, ...doc.data() });
    });
    res.json(content);
  } catch (error) {
    console.error('Error getting user content:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private
const updateContent = async (req, res) => {
  try {
    const docRef = db.collection('content').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check ownership
    if (doc.data().user_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    await docRef.update(updateData);
    
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private
const deleteContent = async (req, res) => {
  try {
    const docRef = db.collection('content').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check ownership
    if (doc.data().userId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await docRef.delete();
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createContent,
  getAllContent,
  getContentById,
  getUserContent,
  updateContent,
  deleteContent
};
