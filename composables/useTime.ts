/**
 * Time Composable
 *
 * Time formatting utilities for timestamps and durations.
 * Pure functions with no dependencies.
 */

// ============================================================================
// Composable
// ============================================================================

export function useTime() {
  /**
   * Format timestamp as relative time (e.g., "2 minutes ago")
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns Relative time string
   */
  function timeAgo(timestamp: number | Date): string {
    const now = Date.now()

    let time: number
    if (timestamp instanceof Date) {
      time = timestamp.getTime()
    } else if (timestamp > 1e12) {
      // Already in milliseconds
      time = timestamp
    } else {
      // Convert seconds to milliseconds
      time = timestamp * 1000
    }

    const diff = now - time

    // Handle future dates
    if (diff < 0) {
      return 'just now'
    }

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    if (seconds < 60) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    if (weeks < 4) return `${weeks}w ago`
    if (months < 12) return `${months}mo ago`
    return `${years}y ago`
  }

  /**
   * Format timestamp as relative time with more detail
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns Detailed relative time string
   */
  function timeAgoDetailed(timestamp: number | Date): string {
    const now = Date.now()

    let time: number
    if (timestamp instanceof Date) {
      time = timestamp.getTime()
    } else if (timestamp > 1e12) {
      time = timestamp
    } else {
      time = timestamp * 1000
    }

    const diff = now - time

    if (diff < 0) {
      return 'just now'
    }

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`

    // For older dates, show the actual date
    return formatDate(time)
  }

  /**
   * Format timestamp as full date/time
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns Formatted date/time string
   */
  function formatDateTime(timestamp: number | Date): string {
    const date = toDate(timestamp)
    return date.toLocaleString()
  }

  /**
   * Format timestamp as date only
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns Formatted date string
   */
  function formatDate(timestamp: number | Date): string {
    const date = toDate(timestamp)
    return date.toLocaleDateString()
  }

  /**
   * Format timestamp as time only
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns Formatted time string
   */
  function formatTime(timestamp: number | Date): string {
    const date = toDate(timestamp)
    return date.toLocaleTimeString()
  }

  /**
   * Format timestamp as ISO string
   * @param timestamp - Unix timestamp in seconds or milliseconds, or Date object
   * @returns ISO formatted string
   */
  function formatISO(timestamp: number | Date): string {
    const date = toDate(timestamp)
    return date.toISOString()
  }

  /**
   * Format duration in seconds to human readable
   * @param seconds - Duration in seconds
   * @returns Human readable duration
   */
  function formatDuration(seconds: number): string {
    if (seconds < 0) seconds = 0

    if (seconds < 60) return `${Math.floor(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  /**
   * Format duration with more detail
   * @param seconds - Duration in seconds
   * @returns Detailed duration string
   */
  function formatDurationDetailed(seconds: number): string {
    if (seconds < 0) seconds = 0

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

    return parts.join(' ')
  }

  /**
   * Format block time (average 2 minutes per block)
   * @param blocks - Number of blocks
   * @returns Estimated time string
   */
  function formatBlockTime(blocks: number): string {
    const seconds = blocks * 120 // ~2 minutes per block
    return formatDuration(seconds)
  }

  /**
   * Get timestamp for start of day
   * @param date - Date to get start of day for
   * @returns Unix timestamp in milliseconds
   */
  function startOfDay(date: Date = new Date()): number {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  /**
   * Get timestamp for end of day
   * @param date - Date to get end of day for
   * @returns Unix timestamp in milliseconds
   */
  function endOfDay(date: Date = new Date()): number {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }

  /**
   * Check if timestamp is today
   * @param timestamp - Unix timestamp in seconds or milliseconds
   * @returns Whether timestamp is today
   */
  function isToday(timestamp: number): boolean {
    const date = toDate(timestamp)
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  /**
   * Convert various timestamp formats to Date
   * @param timestamp - Unix timestamp or Date
   * @returns Date object
   */
  function toDate(timestamp: number | Date): Date {
    if (timestamp instanceof Date) {
      return timestamp
    }
    // If timestamp is in seconds (< 1e12), convert to milliseconds
    if (timestamp < 1e12) {
      return new Date(timestamp * 1000)
    }
    return new Date(timestamp)
  }

  return {
    // Relative time
    timeAgo,
    timeAgoDetailed,

    // Formatting
    formatDateTime,
    formatDate,
    formatTime,
    formatISO,

    // Duration
    formatDuration,
    formatDurationDetailed,
    formatBlockTime,

    // Utilities
    startOfDay,
    endOfDay,
    isToday,
    toDate,
  }
}
