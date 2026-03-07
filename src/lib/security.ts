/**
 * Security configuration and utilities
 * Update ALLOWED_ORIGIN to your production domain when deploying
 */

// CORS: Change this to your production domain
export const ALLOWED_ORIGIN = "https://id-preview--50948d4c-97c6-4338-a33a-59e9cf03b7c0.lovable.app";

// Cloudflare Turnstile site key (public — safe to store in code)
export const TURNSTILE_SITE_KEY = "0x4AAAAAABfTp1234567890"; // Replace with your actual site key
