const { db } = require('./firebaseAdmin');

// Content validation middleware
const validateContentData = (req, res, next) => {
  console.log('=== VALIDATION MIDDLEWARE START ===');
  console.log('Request body for validation:', JSON.stringify(req.body, null, 2));

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

  console.log('Extracted fields:', {
    title: typeof title,
    type: typeof type,
    url: typeof url,
    description: typeof description,
    target_platforms: typeof target_platforms,
    scheduled_promotion_time: typeof scheduled_promotion_time,
    promotion_frequency: typeof promotion_frequency,
    max_budget: typeof max_budget
  });

  const errors = [];

  // Required field validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!type || typeof type !== 'string') {
    errors.push('Type is required and must be a string');
  } else {
    const validTypes = ['article', 'video', 'image', 'audio'];
    if (!validTypes.includes(type)) {
      errors.push(`Invalid content type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  // URL validation - make it conditional based on content type
  if (type === 'article') {
    // For articles, either URL or articleText is required
    if (!url && !req.body.articleText) {
      errors.push('Either URL or articleText is required for article content');
    } else if (url && typeof url !== 'string') {
      errors.push('URL must be a string if provided');
    } else if (url) {
      try {
        new URL(url);
      } catch (error) {
        errors.push('Invalid URL format');
      }
    } else if (req.body.articleText && typeof req.body.articleText !== 'string') {
      errors.push('articleText must be a string if provided');
    }
  } else if (type === 'video' || type === 'image' || type === 'audio') {
    // For video/image/audio, file must be provided
    if (!req.file) {
      errors.push('A file must be uploaded for video, image, or audio content');
    }
  } else if (url !== undefined) {
    // For other content types, URL is optional but if provided must be valid
    if (typeof url !== 'string') {
      errors.push('URL must be a string if provided');
    } else {
      try {
        new URL(url);
      } catch (error) {
        errors.push('Invalid URL format');
      }
    }
  }

  // Optional field validation
  if (description !== undefined && typeof description !== 'string') {
    errors.push('Description must be a string');
  }

  if (target_platforms !== undefined) {
    if (!Array.isArray(target_platforms)) {
      errors.push('Target platforms must be an array');
    } else {
      const validPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'linkedin', 'pinterest'];
      const invalidPlatforms = target_platforms.filter(platform => !validPlatforms.includes(platform));
      if (invalidPlatforms.length > 0) {
        errors.push(`Invalid platforms: ${invalidPlatforms.join(', ')}`);
      }
    }
  }

  if (scheduled_promotion_time !== undefined && scheduled_promotion_time !== null) {
    if (typeof scheduled_promotion_time !== 'string') {
      errors.push('Scheduled promotion time must be a string');
    } else {
      const date = new Date(scheduled_promotion_time);
      if (isNaN(date.getTime())) {
        errors.push('Invalid scheduled promotion time format');
      } else if (date <= new Date()) {
        errors.push('Scheduled promotion time must be in the future');
      }
    }
  }

  if (promotion_frequency !== undefined && typeof promotion_frequency !== 'string') {
    errors.push('Promotion frequency must be a string');
  } else if (promotion_frequency) {
    const validFrequencies = ['once', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'];
    if (!validFrequencies.includes(promotion_frequency)) {
      errors.push(`Invalid promotion frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  if (target_rpm !== undefined && (typeof target_rpm !== 'number' || target_rpm < 0)) {
    errors.push('Target RPM must be a non-negative number');
  }

  if (min_views_threshold !== undefined && (typeof min_views_threshold !== 'number' || min_views_threshold < 0)) {
    errors.push('Minimum views threshold must be a non-negative number');
  }

  if (max_budget !== undefined && (typeof max_budget !== 'number' || max_budget < 0)) {
    errors.push('Maximum budget must be a non-negative number');
  }

  if (errors.length > 0) {
    console.log('=== VALIDATION FAILED ===');
    console.log('Validation errors:', errors);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  console.log('=== VALIDATION PASSED ===');
  next();
};

// User validation middleware
const validateUserData = (req, res, next) => {
  const { email, name, role } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (role !== undefined && typeof role !== 'string') {
    errors.push('Role must be a string');
  } else if (role) {
    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Analytics validation middleware
const validateAnalyticsData = (req, res, next) => {
  const { content_id, event_type, timestamp, metadata } = req.body;
  const errors = [];

  if (!content_id || typeof content_id !== 'string') {
    errors.push('Content ID is required and must be a string');
  }

  if (!event_type || typeof event_type !== 'string') {
    errors.push('Event type is required and must be a string');
  } else {
    const validEventTypes = ['view', 'click', 'share', 'like', 'comment', 'follow'];
    if (!validEventTypes.includes(event_type)) {
      errors.push(`Invalid event type. Must be one of: ${validEventTypes.join(', ')}`);
    }
  }

  if (timestamp !== undefined) {
    if (typeof timestamp !== 'string') {
      errors.push('Timestamp must be a string');
    } else {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        errors.push('Invalid timestamp format');
      }
    }
  }

  if (metadata !== undefined && typeof metadata !== 'object') {
    errors.push('Metadata must be an object');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Promotion validation middleware
const validatePromotionData = (req, res, next) => {
  const {
    content_id,
    platform,
    schedule_type,
    start_time,
    frequency,
    budget,
    target_metrics
  } = req.body;

  const errors = [];

  if (!content_id || typeof content_id !== 'string') {
    errors.push('Content ID is required and must be a string');
  }

  if (!platform || typeof platform !== 'string') {
    errors.push('Platform is required and must be a string');
  } else {
    const validPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'linkedin', 'pinterest', 'all'];
    if (!validPlatforms.includes(platform)) {
      errors.push(`Invalid platform. Must be one of: ${validPlatforms.join(', ')}`);
    }
  }

  if (schedule_type !== undefined && typeof schedule_type !== 'string') {
    errors.push('Schedule type must be a string');
  } else if (schedule_type) {
    const validScheduleTypes = ['specific', 'recurring', 'continuous'];
    if (!validScheduleTypes.includes(schedule_type)) {
      errors.push(`Invalid schedule type. Must be one of: ${validScheduleTypes.join(', ')}`);
    }
  }

  if (start_time !== undefined && typeof start_time !== 'string') {
    errors.push('Start time must be a string');
  } else if (start_time) {
    const date = new Date(start_time);
    if (isNaN(date.getTime())) {
      errors.push('Invalid start time format');
    }
  }

  if (frequency !== undefined && typeof frequency !== 'string') {
    errors.push('Frequency must be a string');
  } else if (frequency) {
    const validFrequencies = ['once', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'];
    if (!validFrequencies.includes(frequency)) {
      errors.push(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  if (budget !== undefined && (typeof budget !== 'number' || budget < 0)) {
    errors.push('Budget must be a non-negative number');
  }

  if (target_metrics !== undefined && typeof target_metrics !== 'object') {
    errors.push('Target metrics must be an object');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Rate limiting validation
const validateRateLimit = async (req, res, next) => {
  try {
    const userId = req.userId;
    const collectionName = req.baseUrl.split('/').pop(); // Extract collection from URL
    const operation = req.method.toLowerCase();

    // TEMPORARILY DISABLED: Rate limiting for testing
    // TODO: Re-enable after testing is complete
    console.log('Rate limiting validation temporarily disabled for testing');
    /*
    // Define rate limits (customize as needed)
    const rateLimits = {
      content: { create: { max: 1, window: 21 * 24 * 60 * 60 * 1000 } }, // 1 per 3 weeks
      analytics: { create: { max: 100, window: 60 * 1000 } }, // 100 per minute
      promotions: { create: { max: 10, window: 24 * 60 * 60 * 1000 } } // 10 per day
    };

    const limit = rateLimits[collectionName]?.[operation];
    if (!limit) {
      return next(); // No rate limit for this operation
    }

    const cutoffDate = new Date(Date.now() - limit.window);
    const recentOperations = await db.collection(collectionName)
      .where('user_id', '==', userId)
      .where('created_at', '>=', cutoffDate)
      .get();

    if (recentOperations.size >= limit.max) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${limit.max} ${operation} operations per ${Math.floor(limit.window / (24 * 60 * 60 * 1000))} days`,
        retry_after: Math.ceil((cutoffDate.getTime() + limit.window - Date.now()) / 1000)
      });
    }
    */

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Allow operation if rate limiting fails
  }
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    } else if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};

module.exports = {
  validateContentData,
  validateUserData,
  validateAnalyticsData,
  validatePromotionData,
  validateRateLimit,
  sanitizeInput
};
