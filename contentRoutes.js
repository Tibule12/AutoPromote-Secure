const express = require('express');
const multer = require('multer');
const { db, storage } = require('./firebaseAdmin');
const authMiddleware = require('./authMiddleware');
const {
  validateContentData,
  validateAnalyticsData,
  validatePromotionData,
  validateRateLimit,
  sanitizeInput
} = require('./validationMiddleware');
const promotionService = require('./promotionService');
const optimizationService = require('./optimizationService');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov', 'audio/mp3', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'), false);
    }
  }
});

// Helper function to upload file to Firebase Storage
const uploadFileToStorage = async (file, userId, contentType) => {
  try {
    const bucket = storage.bucket();
    const fileName = `${userId}/${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadTime: new Date().toISOString(),
          userId: userId,
          contentType: contentType
        }
      },
      public: true, // Make file publicly accessible
      resumable: false
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Error uploading to Firebase Storage:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          console.log('✅ File uploaded to Firebase Storage:', publicUrl);
          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      });

      stream.end(file.buffer);
    });
  } catch (error) {
    console.error('Error in uploadFileToStorage:', error);
    throw error;
  }
};

// Helper function to check if user can upload (rate limiting)
const canUserUpload = async (userId, daysAgo = 21) => {
  const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  try {
    const snapshot = await db.collection('content')
      .where('user_id', '==', userId)
      .where('created_at', '>=', cutoffDate)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      // No recent content, can upload
      return { canUpload: true, reason: null };
    }

    const mostRecentContent = snapshot.docs[0].data();
    const createdAt = mostRecentContent.created_at;

    // If created_at is a Firestore Timestamp, convert to Date
    const createdDate = createdAt && createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const daysSinceUpload = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpload < daysAgo) {
      return {
        canUpload: false,
        reason: `Last upload was ${daysSinceUpload.toFixed(1)} days ago. Must wait ${daysAgo} days between uploads.`,
        daysSinceLastUpload: daysSinceUpload,
        lastUploadDate: createdDate.toISOString()
      };
    }

    return { canUpload: true, reason: null };
  } catch (error) {
    console.error('Error checking user upload eligibility:', error);
    // On error, allow upload to avoid blocking users
    return { canUpload: true, reason: null };
  }
};

// Get all content (public endpoint)
router.get('/', async (req, res) => {
  try {
    const contentRef = db.collection('content');
    const snapshot = await contentRef
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();

    const content = [];
    snapshot.forEach(doc => {
      content.push({ id: doc.id, ...doc.data() });
    });

    res.json({ content });
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint without authentication for debugging - saves to Firebase
router.post('/upload-test', sanitizeInput, validateContentData, async (req, res) => {
  try {
    console.log('=== TEST UPLOAD REQUEST START ===');
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));

    const {
      title,
      type,
      url,
      description,
      target_platforms,
      scheduled_promotion_time,
      promotion_frequency,
      target_rpm,
      min_views_threshold,
      max_budget
    } = req.body;

    console.log('Parsed request data:', {
      title: title ? 'provided' : 'MISSING',
      type: type ? 'provided' : 'MISSING',
      url: url ? 'provided' : 'MISSING',
      description: description || 'none',
      target_platforms: target_platforms ? 'provided' : 'none',
      scheduled_promotion_time: scheduled_promotion_time || 'none',
      promotion_frequency: promotion_frequency || 'none',
      max_budget: max_budget || 'none'
    });

    // Create content document
    const contentData = {
      title,
      type,
      url,
      description,
      target_platforms,
      scheduled_promotion_time,
      promotion_frequency,
      target_rpm,
      min_views_threshold,
      max_budget,
      user_id: 'test-user',
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    console.log('Content data to be saved:', JSON.stringify(contentData, null, 2));

    // Filter out undefined values for Firestore
    const filteredContentData = Object.fromEntries(
      Object.entries(contentData).filter(([_, value]) => value !== undefined)
    );

    console.log('Filtered content data for Firestore:', JSON.stringify(filteredContentData, null, 2));

    // Save to Firebase
    const { db } = require('./firebaseAdmin');
    const docRef = await db.collection('content').add(filteredContentData);
    const savedContent = { id: docRef.id, ...contentData };

    console.log('=== TEST UPLOAD SUCCESS - SAVED TO FIREBASE ===');
    console.log('Document ID:', docRef.id);

    res.status(201).json({
      message: 'Content uploaded successfully and saved to Firebase',
      content: savedContent
    });

  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Upload content with advanced scheduling and optimization
router.post('/upload', authMiddleware, upload.single('file'), sanitizeInput, validateContentData, validateRateLimit, async (req, res) => {
  try {
    console.log('=== CONTENT UPLOAD REQUEST START ===');
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Present' : 'Missing',
      'user-agent': req.headers['user-agent']
    });
    console.log('User ID from auth:', req.userId);
    console.log('File uploaded:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');

    const {
      title,
      type,
      url,
      description,
      target_platforms,
      scheduled_promotion_time,
      promotion_frequency,
      target_rpm,
      min_views_threshold,
      max_budget
    } = req.body;

    console.log('Parsed request data:', {
      title: title ? 'provided' : 'MISSING',
      type: type ? 'provided' : 'MISSING',
      url: url ? 'provided' : 'MISSING',
      description: description || 'none',
      target_platforms: target_platforms ? 'provided' : 'none',
      scheduled_promotion_time: scheduled_promotion_time || 'none',
      promotion_frequency: promotion_frequency || 'none',
      max_budget: max_budget || 'none'
    });

    // TEMPORARILY DISABLED: Rate limiting for testing
    // TODO: Re-enable after testing is complete
    console.log('Rate limiting temporarily disabled for testing');
    /*
    const uploadCheck = await canUserUpload(req.userId, 21);
    if (!uploadCheck.canUpload) {
      console.log('Rate limit exceeded for user:', req.userId, 'Reason:', uploadCheck.reason);
      return res.status(400).json({
        error: 'Rate limit exceeded',
        message: uploadCheck.reason,
        days_since_last_upload: uploadCheck.daysSinceLastUpload,
        last_upload_date: uploadCheck.lastUploadDate
      });
    }
    */

    // Handle file upload for video/image/audio content
    let finalUrl = url;
    if (req.file && (type === 'video' || type === 'image' || type === 'audio')) {
      console.log('📤 Uploading file to Firebase Storage...');
      try {
        finalUrl = await uploadFileToStorage(req.file, req.userId, type);
        console.log('✅ File uploaded successfully, URL:', finalUrl);
      } catch (uploadError) {
        console.error('❌ File upload failed:', uploadError);
        return res.status(500).json({
          error: 'File upload failed',
          details: uploadError.message
        });
      }
    } else if (!req.file && !url && type !== 'article') {
      // For non-article content, either file or URL must be provided
      return res.status(400).json({
        error: 'File or URL required',
        message: 'For video, image, and audio content, you must either upload a file or provide a URL.'
      });
    }

    // Handle article content - store article text as content
    if (type === 'article' && req.body.articleText) {
      console.log('📝 Processing article content...');
      // For articles, we'll store the article text directly in the content
      // You might want to implement a more sophisticated storage solution later
      finalUrl = `data:text/plain;base64,${Buffer.from(req.body.articleText).toString('base64')}`;
      console.log('✅ Article content processed');
    }

    // Set business rules
    const optimalRPM = 900000; // Revenue per million views
    const minViews = 2000000; // 2 million views per day
    const creatorPayoutRate = 0.01; // 1%
    const maxBudget = max_budget || 1000;

    // Insert content into Firestore
    console.log('Preparing to save content to Firestore...');
    const contentRef = db.collection('content').doc();
    const contentData = {
      user_id: req.userId,
      title,
      type,
      url: finalUrl,
      description: description || '',
      target_platforms: target_platforms || ['youtube', 'tiktok', 'instagram'],
      status: 'pending', // All new content must be reviewed by admin
      scheduled_promotion_time: scheduled_promotion_time || null,
      promotion_frequency: promotion_frequency || 'once',
      next_promotion_time: scheduled_promotion_time || null,
      target_rpm: optimalRPM,
      min_views_threshold: minViews,
      max_budget: maxBudget,
      created_at: new Date(),
      promotion_started_at: scheduled_promotion_time ? null : new Date(),
      revenue_per_million: optimalRPM,
      creator_payout_rate: creatorPayoutRate,
      views: 0,
      revenue: 0,
      file_metadata: req.file ? {
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_at: new Date().toISOString()
      } : null
    };

    console.log('Content data to save:', JSON.stringify(contentData, null, 2));
    console.log('Firestore document ID will be:', contentRef.id);

    try {
      await contentRef.set(contentData);
      console.log('✅ Content successfully saved to Firestore with ID:', contentRef.id);
    } catch (firestoreError) {
      console.error('❌ Firestore write error:', firestoreError);
      console.error('Error details:', {
        code: firestoreError.code,
        message: firestoreError.message,
        stack: firestoreError.stack
      });
      throw firestoreError;
    }

    const content = { id: contentRef.id, ...contentData };
    console.log('Content object created:', { id: content.id, title: content.title, type: content.type });
    let promotionSchedule = null;

    // Create promotion schedule if scheduled time is provided
    if (scheduled_promotion_time) {
      try {
        promotionSchedule = await promotionService.schedulePromotion(content.id, {
          platform: 'all',
          schedule_type: promotion_frequency === 'once' ? 'specific' : 'recurring',
          start_time: scheduled_promotion_time,
          frequency: promotion_frequency,
          is_active: true,
          budget: maxBudget,
          target_metrics: {
            target_views: minViews,
            target_rpm: optimalRPM
          }
        });
      } catch (scheduleError) {
        console.error('Error creating promotion schedule:', scheduleError);
      }
    }

    // Generate optimization recommendations
    const recommendations = optimizationService.generateOptimizationRecommendations(content);

    // Schedule content for auto-removal after 2 days (pseudo, needs background job in production)
    // You should implement a cron job or scheduled function to delete content after 2 days

    console.log('✅ Upload process completed successfully');
    console.log('Response data:', {
      message: scheduled_promotion_time ? 'Content uploaded and scheduled for promotion' : 'Content uploaded successfully',
      contentId: content.id,
      hasPromotionSchedule: !!promotionSchedule,
      hasRecommendations: !!recommendations,
      fileUploaded: !!req.file,
      storageUrl: finalUrl
    });

    res.status(201).json({
      message: scheduled_promotion_time ? 'Content uploaded and scheduled for promotion' : 'Content uploaded successfully',
      content,
      promotion_schedule: promotionSchedule,
      optimization_recommendations: recommendations,
      optimal_rpm: optimalRPM,
      creator_payout: minViews * (optimalRPM / 1000000) * creatorPayoutRate,
      file_uploaded: !!req.file,
      storage_url: finalUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's content
router.get('/my-content', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching user content for userId:', req.userId);

    const contentSnapshot = await db.collection('content')
      .where('user_id', '==', req.userId)
      .orderBy('created_at', 'desc')
      .get();

    console.log('Found', contentSnapshot.size, 'content items for user');

    const content = [];
    contentSnapshot.forEach(doc => {
      const data = doc.data();
      content.push({
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.() ? data.created_at.toDate().toISOString() : data.created_at
      });
    });

    console.log('Successfully processed', content.length, 'content items');
    res.json({ content });
  } catch (error) {
    console.error('Error getting user content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get content by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const contentRef = db.collection('content').doc(req.params.id);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const data = contentDoc.data();
    if (data.user_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      content: {
        id: contentDoc.id,
        ...data,
        created_at: data.created_at?.toDate?.() ? data.created_at.toDate().toISOString() : data.created_at
      }
    });
  } catch (error) {
    console.error('Error getting content by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update content
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, target_platforms } = req.body;
    const contentRef = db.collection('content').doc(req.params.id);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists || contentDoc.data().user_id !== req.userId) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await contentRef.update({
      title,
      description,
      target_platforms,
      updated_at: new Date()
    });

    const updatedDoc = await contentRef.get();
    res.json({
      message: 'Content updated successfully',
      content: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete content
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const contentRef = db.collection('content').doc(req.params.id);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists || contentDoc.data().user_id !== req.userId) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await contentRef.delete();
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/content/promote/:id - Start promotion for content
router.post('/promote/:id', authMiddleware, async (req, res) => {
  try {
    const contentId = req.params.id;
    console.log(`🔍 Promotion request for content ID: ${contentId} by user ID: ${req.userId}`);

    // Verify content ownership
    const contentRef = db.collection('content').doc(contentId);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists || contentDoc.data().user_id !== req.userId) {
      console.error('❌ Content ownership verification failed');
      return res.status(404).json({ error: 'Content not found or access denied' });
    }

    console.log('✅ Content ownership verified successfully');

    // Schedule promotion with default parameters or customize as needed
    const scheduleData = {
      platform: 'all',
      schedule_type: 'specific',
      start_time: new Date().toISOString(),
      frequency: 'once',
      is_active: true,
      budget: 1000,
      target_metrics: {
        target_views: 1000000,
        target_rpm: 1000
      }
    };

    console.log('📋 Attempting to schedule promotion with data:', scheduleData);
    const promotion = await promotionService.schedulePromotion(contentId, scheduleData);
    console.log('✅ Promotion scheduled successfully:', promotion);

    res.status(200).json({
      message: 'Promotion started successfully',
      promotion
    });
  } catch (error) {
    console.error('❌ Error starting promotion:', error);
    console.error('📋 Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get optimization recommendations for content
router.get('/:id/optimization', authMiddleware, async (req, res) => {
  try {
    const contentRef = db.collection('content').doc(req.params.id);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists || contentDoc.data().user_id !== req.userId) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = { id: contentDoc.id, ...contentDoc.data() };

    // Get analytics data for better recommendations
    const analyticsSnapshot = await db.collection('analytics')
      .where('content_id', '==', req.params.id)
      .orderBy('metrics_updated_at', 'desc')
      .limit(1)
      .get();

    const analyticsData = analyticsSnapshot.empty ? {} : analyticsSnapshot.docs[0].data();

    const recommendations = optimizationService.generateOptimizationRecommendations(content, analyticsData);
    const platformOptimization = optimizationService.optimizePromotionSchedule(
      content,
      content.target_platforms || ['youtube', 'tiktok', 'instagram']
    );

    res.json({
      recommendations,
      platform_optimization: platformOptimization,
      current_metrics: {
        target_rpm: content.target_rpm,
        min_views_threshold: content.min_views_threshold,
        max_budget: content.max_budget
      }
    });
  } catch (error) {
    console.error('Error getting optimization recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

