/**
 * Performance Monitoring Utility
 * Tracks and reports Core Web Vitals and custom metrics
 */

// Performance metrics storage
const performanceMetrics = {
  pageLoadTime: 0,
  apiCalls: [],
  imageLoadTimes: [],
  webVitals: {},
};

/**
 * Track page load performance
 */
export function trackPageLoad() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const navigationTiming = performance.getEntriesByType("navigation")[0];
    if (navigationTiming) {
      performanceMetrics.pageLoadTime = navigationTiming.loadEventEnd - navigationTiming.loadEventStart;
      
      // Log metrics
      logMetrics({
        eventName: "page_load",
        ttfb: navigationTiming.responseStart - navigationTiming.fetchStart,
        fcp: navigationTiming.domLoading - navigationTiming.fetchStart,
        lcp: navigationTiming.loadEventStart - navigationTiming.fetchStart,
      });
    }
  });
}

/**
 * Track API call performance
 */
export function trackApiCall(endpoint, duration, success = true) {
  performanceMetrics.apiCalls.push({
    endpoint,
    duration,
    success,
    timestamp: new Date(),
  });

  if (duration > 1000) {
    console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
  }
}

/**
 * Track image loading performance
 */
export function trackImageLoad(src, duration) {
  performanceMetrics.imageLoadTimes.push({
    src,
    duration,
    timestamp: new Date(),
  });

  if (duration > 500) {
    console.warn(`Slow image load: ${src} took ${duration}ms`);
  }
}

/**
 * Report Web Vitals to analytics
 * Call with Google Analytics or custom endpoint
 */
export function reportWebVitals(metric) {
  performanceMetrics.webVitals[metric.name] = metric.value;

  // Send to analytics if in production
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    // Example: Send to Google Analytics
    if (window.gtag) {
      window.gtag("event", metric.name, {
        value: Math.round(metric.value),
        event_category: "web_vitals",
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Or send to custom endpoint
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    //   keepalive: true,
    // });
  }
}

/**
 * Get current performance metrics
 */
export function getMetrics() {
  return {
    pageLoadTime: performanceMetrics.pageLoadTime,
    averageApiCallDuration:
      performanceMetrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) /
        performanceMetrics.apiCalls.length || 0,
    slowApiCalls: performanceMetrics.apiCalls.filter((call) => call.duration > 1000),
    averageImageLoadTime:
      performanceMetrics.imageLoadTimes.reduce((sum, img) => sum + img.duration, 0) /
        performanceMetrics.imageLoadTimes.length || 0,
    slowImages: performanceMetrics.imageLoadTimes.filter((img) => img.duration > 500),
    webVitals: performanceMetrics.webVitals,
  };
}

/**
 * Log metrics to console (development) or analytics service
 */
function logMetrics(data) {
  if (process.env.NODE_ENV === "development") {
    console.group("Performance Metrics");
    console.table(data);
    console.groupEnd();
  }

  // Send important metrics to analytics in production
  if (
    process.env.NODE_ENV === "production" &&
    typeof window !== "undefined" &&
    window.fetch
  ) {
    // Queued batch reporting to avoid blocking
    setTimeout(() => {
      fetch("/api/metrics", {
        method: "POST",
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't impact user experience
      });
    }, 0);
  }
}

/**
 * Monitor long tasks (>50ms)
 */
export function monitorLongTasks() {
  if (typeof window === "undefined" || !PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn(
          `Long task detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`
        );
      }
    });

    observer.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    // LongTask API not supported
  }
}

/**
 * Monitor memory usage in development
 */
export function monitorMemory() {
  if (
    typeof window === "undefined" ||
    !performance.memory ||
    process.env.NODE_ENV !== "development"
  ) {
    return;
  }

  setInterval(() => {
    const memory = performance.memory;
    const usedMemory = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    if (usedMemory > 70) {
      console.warn(`High memory usage: ${usedMemory.toFixed(2)}%`);
    }
  }, 5000);
}
