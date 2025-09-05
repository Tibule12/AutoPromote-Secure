// BUSINESS RULE: Revenue per 1M views is $900,000. Creator gets 5% of revenue. Target views: 2M/day.
// Creator payout per 2M views: 2 * $900,000 * 0.05 = $90,000
// BUSINESS RULE: Content must be auto-removed after 2 days of upload.
// In production, implement a scheduled job (e.g., with Firebase Cloud Functions or Cloud Scheduler)
// to delete or archive content where created_at is older than 2 days.

// Example (using Firebase Cloud Functions):
// exports.cleanupOldContent = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
//   const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
//   const snapshot = await db.collection('content')
//     .where('created_at', '<', twoDaysAgo)
//     .get();
//   
//   const batch = db.batch();
//   snapshot.docs.forEach((doc) => {
//     batch.delete(doc.ref);
//   });
//   
//   await batch.commit();
// });

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
    } else if (!url && type !== 'article') {
      // For non-article content, either file or URL must be provided
      return res.status(400).json({
        error: 'File upload required',
        message: 'For video, image, and audio content, you must either upload a file or provide a URL'
      });
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
    const { data: content, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update content
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, target_platforms } = req.body;
    const contentRef = db.collection('content').doc(req.params.id);
    const contentDoc = await contentRef.get();

    if (!contentDoc.exists || contentDoc.data().user_id !== req.user.uid) {
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

    if (!contentDoc.exists || contentDoc.data().user_id !== req.user.uid) {
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
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', contentId)
      .eq('user_id', req.userId)
      .single();

    if (contentError || !content) {
      console.error('❌ Content ownership verification failed:', contentError?.message || 'Content not found');
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

// Promotion Schedule Management Endpoints

// Get all promotion schedules for content
router.get('/:id/promotion-schedules', authMiddleware, async (req, res) => {
  try {
    // Verify content ownership
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (contentError || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const schedules = await promotionService.getContentPromotionSchedules(req.params.id);
    res.json({ schedules });
  } catch (error) {
    console.error('Error getting promotion schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create promotion schedule
router.post('/:id/promotion-schedules', authMiddleware, async (req, res) => {
  try {
    // Verify content ownership
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (contentError || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const schedule = await promotionService.schedulePromotion(req.params.id, req.body);
    res.status(201).json({ schedule });
  } catch (error) {
    console.error('Error creating promotion schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update promotion schedule
router.put('/promotion-schedules/:scheduleId', authMiddleware, async (req, res) => {
  try {
    const schedule = await promotionService.updatePromotionSchedule(req.params.scheduleId, req.body);
    res.json({ schedule });
  } catch (error) {
    console.error('Error updating promotion schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete promotion schedule
router.delete('/promotion-schedules/:scheduleId', authMiddleware, async (req, res) => {
  try {
    await promotionService.deletePromotionSchedule(req.params.scheduleId);
    res.json({ message: 'Promotion schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion schedule:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get optimization recommendations for content
router.get('/:id/optimization', authMiddleware, async (req, res) => {
  try {
    const { data: content, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get analytics data for better recommendations
    const { data: analytics } = await supabase
      .from('analytics')
      .select('*')
      .eq('content_id', req.params.id)
      .order('metrics_updated_at', { ascending: false })
      .limit(1);

    const analyticsData = analytics && analytics.length > 0 ? analytics[0] : {};

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

// Update content status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'scheduled', 'published', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('content')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'published' && !req.body.keep_promotion_time ? {
          promotion_started_at: new Date().toISOString(),
          scheduled_promotion_time: null
        } : {})
      })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ 
      message: `Content status updated to ${status}`,
      content: data[0]
    });
  } catch (error) {
    console.error('Error updating content status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update content status
router.patch('/bulk/status', authMiddleware, async (req, res) => {
  try {
    const { content_ids, status } = req.body;
    
    if (!Array.isArray(content_ids) || content_ids.length === 0) {
      return res.status(400).json({ error: 'Content IDs array is required' });
    }

    if (!['draft', 'scheduled', 'published', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('content')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'published' ? {
          promotion_started_at: new Date().toISOString(),
          scheduled_promotion_time: null
        } : {})
      })
      .in('id', content_ids)
      .eq('user_id', req.userId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: `Updated status for ${data?.length || 0} content items to ${status}`,
      updated_content: data
    });
  } catch (error) {
    console.error('Error bulk updating content status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get content analytics
router.get('/:id/analytics', authMiddleware, async (req, res) => {
  try {
    const { data: content, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Simulate platform breakdown
    const platformBreakdown = {
      youtube: Math.floor(content.views * 0.4),
      tiktok: Math.floor(content.views * 0.3),
      instagram: Math.floor(content.views * 0.2),
      twitter: Math.floor(content.views * 0.1)
    };

    res.json({
      content,
      platform_breakdown: platformBreakdown,
      performance_metrics: {
        views: content.views,
        revenue: content.revenue,
        rpm: 900000, // Revenue per million
        engagement_rate: Math.random() * 0.15 + 0.05 // 5-20% engagement
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced scheduling endpoints

// Get promotion schedule analytics
router.get('/promotion-schedules/:scheduleId/analytics', authMiddleware, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Verify user has access to this schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('promotion_schedules')
      .select('content:content_id(*)')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule || schedule.content.user_id !== req.userId) {
      return res.status(404).json({ error: 'Schedule not found or access denied' });
    }

    const analytics = await promotionService.getPromotionAnalytics(scheduleId);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting promotion analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk schedule promotions
router.post('/bulk/schedule', authMiddleware, async (req, res) => {
  try {
    const { content_ids, schedule_template } = req.body;
    
    if (!Array.isArray(content_ids) || content_ids.length === 0) {
      return res.status(400).json({ error: 'Content IDs array is required' });
    }

    if (!schedule_template || typeof schedule_template !== 'object') {
      return res.status(400).json({ error: 'Schedule template is required' });
    }

    // Verify user owns all content
    const { data: userContent, error } = await supabase
      .from('content')
      .select('id')
      .in('id', content_ids)
      .eq('user_id', req.userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (userContent.length !== content_ids.length) {
      return res.status(403).json({ error: 'Access denied to some content items' });
    }

    const results = await promotionService.bulkSchedulePromotions(content_ids, schedule_template);
    res.json({ results });
  } catch (error) {
    console.error('Error in bulk scheduling:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process completed promotions (admin endpoint)
router.post('/admin/process-completed-promotions', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (userError || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const processedCount = await promotionService.processCompletedPromotions();
    res.json({ 
      message: `Processed ${processedCount} completed promotions`,
      processed_count: processedCount 
    });
  } catch (error) {
    console.error('Error processing completed promotions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active promotions with filters
router.get('/admin/active-promotions', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.userId)
      .single();

    if (userError || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const filters = {
      platform: req.query.platform,
      content_type: req.query.content_type,
      min_budget: req.query.min_budget ? parseInt(req.query.min_budget) : undefined,
      max_budget: req.query.max_budget ? parseInt(req.query.max_budget) : undefined
    };

    const promotions = await promotionService.getActivePromotions(filters);
    res.json({ promotions });
  } catch (error) {
    console.error('Error getting active promotions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced scheduling options endpoint
router.get('/:id/scheduling-options', authMiddleware, async (req, res) => {
  try {
    const { data: content, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const schedulingOptions = {
      frequencies: [
        { value: 'once', label: 'One-time', description: 'Promote once at specified time' },
        { value: 'hourly', label: 'Hourly', description: 'Promote every hour' },
        { value: 'daily', label: 'Daily', description: 'Promote every day' },
        { value: 'weekly', label: 'Weekly', description: 'Promote every week' },
        { value: 'biweekly', label: 'Bi-weekly', description: 'Promote every two weeks' },
        { value: 'monthly', label: 'Monthly', description: 'Promote every month' },
        { value: 'quarterly', label: 'Quarterly', description: 'Promote every quarter' }
      ],
      platforms: [
        { value: 'youtube', label: 'YouTube', optimal_times: ['15:00-17:00'] },
        { value: 'tiktok', label: 'TikTok', optimal_times: ['19:00-21:00'] },
        { value: 'instagram', label: 'Instagram', optimal_times: ['11:00-13:00', '19:00-21:00'] },
        { value: 'facebook', label: 'Facebook', optimal_times: ['09:00-11:00', '13:00-15:00'] },
        { value: 'twitter', label: 'Twitter', optimal_times: ['08:00-10:00', '16:00-18:00'] },
        { value: 'linkedin', label: 'LinkedIn', optimal_times: ['08:00-10:00', '17:00-19:00'] },
        { value: 'pinterest', label: 'Pinterest', optimal_times: ['14:00-16:00', '20:00-22:00'] }
      ],
      default_settings: {
        budget: optimizationService.calculateOptimalBudget(content),
        target_metrics: {
          target_views: content.min_views_threshold || 1000000,
          target_rpm: content.target_rpm || 900000
        }
      }
    };

    res.json(schedulingOptions);
  } catch (error) {
    console.error('Error getting scheduling options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
