/**
 * Security configuration
 * 
 * IMPORTANT: Update these values before deploying to production:
 * 1. ALLOWED_ORIGIN → your production domain
 * 2. TURNSTILE_SITE_KEY → your Cloudflare Turnstile site key
 */

// CORS: Change this to your production domain when deploying
export const ALLOWED_ORIGIN = "https://id-preview--50948d4c-97c6-4338-a33a-59e9cf03b7c0.lovable.app";

// Cloudflare Turnstile site key (public — safe to store in code)
// Replace with your actual site key from Cloudflare Dashboard → Turnstile
export const TURNSTILE_SITE_KEY = "0x4AAAAAACnwNHJwIarKt0hb";
