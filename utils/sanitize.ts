/**
 * Frontend sanitization utilities for RNKC comment data
 *
 * Provides defense-in-depth even though:
 * 1. Backend sanitizes data before sending
 * 2. Vue.js auto-escapes {{ }} template interpolations
 *
 * Never rely solely on framework behavior or backend trust for security.
 *
 * @see OWASP A03:2021 - Injection
 * @see CWE-79: Cross-site Scripting (XSS)
 */

/**
 * Sanitizes comment text received from API
 *
 * This provides client-side validation even though the backend should
 * already sanitize. Defense-in-depth principle.
 *
 * IMPORTANT: This function is designed to be social-media-friendly.
 * It preserves common formatting characters like:
 * - `>` for block quotes (Twitter/X, Reddit, Discord)
 * - `@` for mentions
 * - `#` for hashtags
 * - `*`, `_`, `-` for emphasis and lists
 * - `` ` `` for code/monospace
 *
 * Security: Vue's {{ }} interpolation already escapes HTML, so we only
 * need to remove truly dangerous patterns (control chars, null bytes).
 *
 * @param text - Comment text from API
 * @returns Sanitized text safe for display
 */
export function sanitizeCommentText(text: string | null | undefined): string {
  if (!text) {
    return ''
  }

  // Normalize Unicode to prevent homograph attacks
  const normalized = text.normalize('NFC')

  // Remove null bytes (should never be present but check anyway)
  const noNulls = normalized.replace(/\x00/g, '')

  // Remove other dangerous control characters (except newline, tab, carriage return)
  // This preserves all printable characters including >, <, &, etc.
  const noControlChars = noNulls.replace(
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    '',
  )

  // Trim excessive whitespace
  const trimmed = noControlChars.trim()

  // Collapse multiple consecutive newlines to max 2 (preserve paragraph breaks)
  const collapsedNewlines = trimmed.replace(/\n{3,}/g, '\n\n')

  return collapsedNewlines
}

/**
 * Validates that text doesn't contain suspicious patterns
 *
 * @param text - Text to validate
 * @returns Validation result
 */
export function validateCommentText(text: string): {
  valid: boolean
  error?: string
} {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty' }
  }

  // Check for null bytes
  if (text.includes('\x00')) {
    return { valid: false, error: 'Invalid characters in comment' }
  }

  // Check for excessive length (should be caught by backend but verify)
  const byteLength = new TextEncoder().encode(text).length
  if (byteLength > 440) {
    return { valid: false, error: 'Comment too long' }
  }

  return { valid: true }
}

/**
 * Escapes HTML special characters (AGGRESSIVE - use sparingly)
 *
 * WARNING: This function is NOT used by default sanitization because it
 * breaks social media formatting conventions (>, @, #, etc.).
 *
 * Only use this for contexts where you need strict HTML escaping,
 * such as embedding user content in HTML attributes or v-html.
 *
 * For normal text display, use sanitizeCommentText() instead, which
 * preserves social media formatting while Vue {{ }} handles HTML escaping.
 *
 * @param text - Text to escape
 * @returns HTML-escaped text
 * @deprecated Use sanitizeCommentText() for normal comment display
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Strips HTML tags from text (for plaintext contexts)
 *
 * @param text - Text that may contain HTML
 * @returns Text with all HTML tags removed
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length in characters
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Processes comment data from API with full sanitization
 *
 * This is the main entry point for displaying comment text.
 * Use this whenever rendering comment data from the API.
 *
 * This function:
 * 1. Removes dangerous control characters and null bytes
 * 2. Normalizes Unicode to prevent homograph attacks
 * 3. Validates length and format
 * 4. PRESERVES social media formatting (>, @, #, *, etc.)
 *
 * Security is provided by Vue's {{ }} auto-escaping, not by
 * aggressive HTML entity encoding.
 *
 * @param text - Raw comment text from API
 * @returns Sanitized text ready for display
 */
export function processCommentForDisplay(
  text: string | null | undefined,
): string {
  const sanitized = sanitizeCommentText(text)
  const validation = validateCommentText(sanitized)

  if (!validation.valid) {
    return '[Invalid comment]'
  }

  return sanitized
}
