#!/bin/bash

# Test script for content upload endpoint
# This script tests the upload endpoint directly with curl

echo "=== Testing Content Upload Endpoint ==="

# API endpoint
API_URL="http://localhost:5000/api/content/upload"

# Test data
TEST_DATA='{
  "title": "Test Content Title",
  "type": "article",
  "url": "https://example.com/test-content",
  "description": "This is a test content description",
  "target_platforms": ["youtube", "tiktok"],
  "scheduled_promotion_time": null,
  "promotion_frequency": "once",
  "max_budget": 1000
}'

echo "Test data:"
echo "$TEST_DATA"
echo ""

# First, we need to get an authentication token
echo "Getting Firebase ID token..."
echo "Please provide a valid Firebase ID token from your authenticated session"
echo "You can get this from the browser console after logging in"
echo ""
read -p "Enter Firebase ID token: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "No token provided. Exiting."
    exit 1
fi

echo ""
echo "Making request to: $API_URL"
echo "Using token: ${TOKEN:0:20}..."
echo ""

# Make the curl request
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$TEST_DATA" \
  -v

echo ""
echo "=== Test Complete ==="
