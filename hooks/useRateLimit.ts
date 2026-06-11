import { useState, useEffect, useCallback } from 'react';

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Unique identifier for this rate limiter */
  key: string;
  /** Storage type: 'memory' (session only) or 'localStorage' (persists across sessions) */
  storageType?: 'memory' | 'localStorage';
}

interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

// In-memory storage for 'memory' type
const memoryStorage: Record<string, RateLimitEntry> = {};

/**
 * Custom hook for client-side rate limiting
 *
 * @example
 * const { isRateLimited, attempt, getRemainingTime, getRemainingAttempts } = useRateLimit({
 *   maxRequests: 3,
 *   windowMs: 60000, // 1 minute
 *   key: 'submit-entry',
 *   storageType: 'localStorage'
 * });
 */
export function useRateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, key, storageType = 'memory' } = config;

  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Storage operations based on storage type
  const getEntry = useCallback((): RateLimitEntry => {
    if (storageType === 'localStorage') {
      const stored = localStorage.getItem(`cadence-rateLimit_${key}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return { timestamps: [] };
        }
      }
      return { timestamps: [] };
    } else {
      return memoryStorage[key] || { timestamps: [] };
    }
  }, [key, storageType]);

  const setEntry = useCallback((entry: RateLimitEntry) => {
    if (storageType === 'localStorage') {
      localStorage.setItem(`cadence-rateLimit_${key}`, JSON.stringify(entry));
    } else {
      memoryStorage[key] = entry;
    }
  }, [key, storageType]);

  const clearEntry = useCallback(() => {
    if (storageType === 'localStorage') {
      localStorage.removeItem(`cadence-rateLimit_${key}`);
    } else {
      delete memoryStorage[key];
    }
  }, [key, storageType]);

  // Check if currently rate limited
  const checkRateLimit = useCallback((): { isLimited: boolean; remainingMs: number; remainingAttempts: number } => {
    const now = Date.now();
    const entry = getEntry();

    // Check if blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        isLimited: true,
        remainingMs: entry.blockedUntil - now,
        remainingAttempts: 0
      };
    }

    // Remove timestamps outside the window
    const validTimestamps = entry.timestamps.filter(
      timestamp => now - timestamp < windowMs
    );

    // Update entry with valid timestamps
    if (validTimestamps.length !== entry.timestamps.length) {
      setEntry({ ...entry, timestamps: validTimestamps, blockedUntil: undefined });
    }

    const remainingAttempts = Math.max(0, maxRequests - validTimestamps.length);

    return {
      isLimited: validTimestamps.length >= maxRequests,
      remainingMs: validTimestamps.length > 0 ? windowMs - (now - validTimestamps[0]) : 0,
      remainingAttempts
    };
  }, [getEntry, setEntry, windowMs, maxRequests]);

  // Update state periodically
  useEffect(() => {
    const updateState = () => {
      const { isLimited, remainingMs } = checkRateLimit();
      setIsRateLimited(isLimited);
      setRemainingTime(remainingMs);
    };

    // Initial check
    updateState();

    // Update every second
    const interval = setInterval(updateState, 1000);

    return () => clearInterval(interval);
  }, [checkRateLimit]);

  /**
   * Attempt to perform the rate-limited action
   * @returns true if allowed, false if rate limited
   */
  const attempt = useCallback((): boolean => {
    const now = Date.now();
    const entry = getEntry();

    // Check if currently blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return false;
    }

    // Remove timestamps outside the window
    const validTimestamps = entry.timestamps.filter(
      timestamp => now - timestamp < windowMs
    );

    // Check if rate limit would be exceeded
    if (validTimestamps.length >= maxRequests) {
      // Block until the oldest timestamp expires
      const blockedUntil = validTimestamps[0] + windowMs;
      setEntry({ timestamps: validTimestamps, blockedUntil });
      setIsRateLimited(true);
      setRemainingTime(blockedUntil - now);
      return false;
    }

    // Add new timestamp
    validTimestamps.push(now);
    setEntry({ timestamps: validTimestamps });

    // Update state immediately
    const { isLimited, remainingMs } = checkRateLimit();
    setIsRateLimited(isLimited);
    setRemainingTime(remainingMs);

    return true;
  }, [getEntry, setEntry, windowMs, maxRequests, checkRateLimit]);

  /**
   * Get remaining time until rate limit resets (in milliseconds)
   */
  const getRemainingTime = useCallback((): number => {
    return remainingTime;
  }, [remainingTime]);

  /**
   * Get remaining attempts before rate limit
   */
  const getRemainingAttempts = useCallback((): number => {
    const { remainingAttempts } = checkRateLimit();
    return remainingAttempts;
  }, [checkRateLimit]);

  /**
   * Format remaining time as human-readable string
   */
  const getFormattedTime = useCallback((): string => {
    if (remainingTime <= 0) return '0s';

    const seconds = Math.ceil(remainingTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }, [remainingTime]);

  /**
   * Reset the rate limiter (clear all data)
   */
  const reset = useCallback(() => {
    clearEntry();
    setIsRateLimited(false);
    setRemainingTime(0);
  }, [clearEntry]);

  return {
    /** Whether the action is currently rate limited */
    isRateLimited,
    /** Attempt to perform the action. Returns true if allowed, false if rate limited */
    attempt,
    /** Get remaining time in milliseconds until rate limit resets */
    getRemainingTime,
    /** Get remaining attempts before hitting rate limit */
    getRemainingAttempts,
    /** Get human-readable formatted time string */
    getFormattedTime,
    /** Reset the rate limiter */
    reset
  };
}

/**
 * Hook specifically for button rate limiting with built-in UI state
 */
export function useButtonRateLimit(config: RateLimitConfig) {
  const rateLimit = useRateLimit(config);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Wrap your button handler with this function
   * @param handler The async function to execute
   * @param onRateLimited Optional callback when rate limited
   */
  const handleClick = useCallback(
    async (
      handler: () => Promise<void> | void,
      onRateLimited?: () => void
    ) => {
      if (isProcessing) return;

      if (!rateLimit.attempt()) {
        if (onRateLimited) {
          onRateLimited();
        }
        return;
      }

      setIsProcessing(true);
      try {
        await handler();
      } finally {
        setIsProcessing(false);
      }
    },
    [rateLimit, isProcessing]
  );

  return {
    ...rateLimit,
    isProcessing,
    handleClick
  };
}

/**
 * Format milliseconds to human-readable string
 */
export function formatRateLimitTime(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}
