// Simulate API POST requests
const fs = require('fs');
const path = require('path');

// Mock content data for testing
const contentData = {
  title: "Test Content",
  type: "video",
  url: "https://example.com/video123",
  description: "This is a test video for API testing",
  target_platforms: ["youtube", "tiktok", "instagram"],
  scheduled_promotion_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  promotion_frequency: "once",
  target_rpm: 800000,
  min_views_threshold: 1000000,
  max_budget: 500
};

// Simulate request validation
function validateContent(data) {
  const errors = [];
  
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required and must be a string');
  }
  
  if (!data.type || typeof data.type !== 'string') {
    errors.push('Type is required and must be a string');
  } else {
    const validTypes = ['article', 'video', 'image', 'audio'];
    if (!validTypes.includes(data.type)) {
      errors.push(`Invalid content type. Must be one of: ${validTypes.join(', ')}`);
    }
  }
  
  if (!data.url || typeof data.url !== 'string') {
    errors.push('URL is required and must be a string');
  } else {
    try {
      new URL(data.url);
    } catch (error) {
      errors.push('Invalid URL format');
    }
  }
  
  return errors;
}

// Simulate request processing
function processContentUpload(data) {
  // Validate the content
  const validationErrors = validateContent(data);
  if (validationErrors.length > 0) {
    return {
      status: 400,
      body: {
        error: 'Validation failed',
        details: validationErrors
      }
    };
  }
  
  // Generate a mock ID
  const contentId = 'content_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Create a mock response
  const response = {
    status: 201,
    body: {
      message: data.scheduled_promotion_time ? 'Content uploaded and scheduled for promotion' : 'Content uploaded successfully',
      content: {
        id: contentId,
        user_id: 'test_user_123',
        ...data,
        status: 'pending',
        created_at: new Date().toISOString(),
        views: 0,
        revenue: 0
      },
      promotion_schedule: data.scheduled_promotion_time ? {
        id: 'promo_' + Date.now().toString(36),
        contentId: contentId,
        platform: 'all',
        scheduleType: 'specific',
        startTime: data.scheduled_promotion_time,
        frequency: data.promotion_frequency,
        isActive: true,
        budget: data.max_budget
      } : null,
      optimization_recommendations: [
        {
          type: 'platform_expansion',
          platform: 'facebook',
          message: 'Add facebook to target platforms for additional reach',
          impact: 'medium'
        },
        {
          type: 'timing_optimization',
          message: 'Consider posting during peak hours (15:00-17:00) for better engagement',
          impact: 'high'
        }
      ],
      optimal_rpm: data.target_rpm,
      creator_payout: (data.min_views_threshold * (data.target_rpm / 1000000) * 0.01).toFixed(2)
    }
  };
  
  return response;
}

// Simulate a POST request
const result = processContentUpload(contentData);

// Log the result
console.log('====== API SIMULATION RESULT ======');
console.log(`Status: ${result.status}`);
console.log('Response Body:');
console.log(JSON.stringify(result.body, null, 2));

// Save the result to a file for inspection
const outputPath = path.join(__dirname, 'api-simulation-result.json');
fs.writeFileSync(outputPath, JSON.stringify(result.body, null, 2));
console.log(`\nResults saved to: ${outputPath}`);
