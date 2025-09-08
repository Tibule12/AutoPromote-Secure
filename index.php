<?php
// Simple PHP Router for Supermarket Website

$page = $_GET['page'] ?? 'home';

// Sanitize the page name to prevent directory traversal
$page = preg_replace('/[^a-zA-Z0-9_-]/', '', $page);

// Default to home if empty
if (empty($page)) {
    $page = 'home';
}

// Check if the page file exists
$pageFile = $page . '.php';

if (file_exists($pageFile)) {
    include $pageFile;
} else {
    // Show 404 page
    include '404.php';
}
?>
