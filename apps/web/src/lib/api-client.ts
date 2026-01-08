/**
 * API Client - Fetch wrapper with authentication, error handling,
 * request/response interceptors, retry logic, and timeout handling.
 */

import { generateId } from './utils';

// =============================================================================
// Types and Interfaces
// =============================================================================

/**
 * Error codes matching the backend error handling system
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Client-side errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  ABORTED: 'ABORTED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API Error response from the backend
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * API Success response from the backend
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly requestId?: string;
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(options: {
    message: string;
    code: ErrorCode;
    statusCode: number;
    details?: unknown;
    requestId?: string;
    timestamp?: string;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.requestId = options.requestId;
    this.timestamp = options.timestamp || new Date().toISOString();
    this.isRetryable = this.checkRetryable(options.statusCode, options.code);

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  private checkRetryable(statusCode: number, code: ErrorCode): boolean {
    // Retry on network errors, timeouts, rate limits, and server errors
    const retryableCodes: ErrorCode[] = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.TIMEOUT_ERROR,
      ErrorCodes.RATE_LIMITED,
      ErrorCodes.SERVICE_UNAVAILABLE,
    ];

    if (retryableCodes.includes(code)) return true;
    if (statusCode >= 500 && statusCode < 600) return true;
    if (statusCode === 408) return true; // Request Timeout
    if (statusCode === 429) return true; // Rate Limited

    return false;
  }
}

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor<T = unknown> = (
  response: T,
  config: RequestConfig
) => T | Promise<T>;

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (
  error: ApiError,
  config: RequestConfig
) => ApiError | Promise<ApiError> | Promise<never>;

/**
 * Request configuration options
 */
export interface RequestConfig extends Omit<RequestInit, 'body' | 'signal'> {
  /** Request body - can be object (JSON) or FormData */
  body?: unknown;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryDelay?: number;
  /** Whether to skip retry logic */
  skipRetry?: boolean;
  /** Custom request ID for tracing */
  requestId?: string;
  /** AbortController signal */
  signal?: AbortSignal;
}

/**
 * API Client configuration
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseUrl?: string;
  /** Default timeout in milliseconds */
  defaultTimeout?: number;
  /** Default number of retries */
  defaultRetries?: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay?: number;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
}

// =============================================================================
// API Client Class
// =============================================================================

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;
  private defaultHeaders: Record<string, string>;

  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl =
      config.baseUrl ||
      (typeof import.meta !== 'undefined'
        ? import.meta.env?.VITE_API_URL
        : undefined) ||
      'http://localhost:3001';
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.defaultRetries = config.defaultRetries ?? 3;
    this.defaultRetryDelay = config.defaultRetryDelay ?? 1000;
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  // ===========================================================================
  // Interceptor Management
  // ===========================================================================

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) this.requestInterceptors.splice(index, 1);
    };
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor<T = unknown>(
    interceptor: ResponseInterceptor<T>
  ): () => void {
    this.responseInterceptors.push(
      interceptor as unknown as ResponseInterceptor
    );
    return () => {
      const index = this.responseInterceptors.indexOf(
        interceptor as unknown as ResponseInterceptor
      );
      if (index !== -1) this.responseInterceptors.splice(index, 1);
    };
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index !== -1) this.errorInterceptors.splice(index, 1);
    };
  }

  // ===========================================================================
  // Core Request Methods
  // ===========================================================================

  /**
   * Main fetch wrapper with all features
   */
  async request<T>(url: string, config: RequestConfig = {}): Promise<T> {
    // Apply request interceptors
    let finalConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      skipRetry = false,
      requestId = generateId(),
      body,
      headers: configHeaders,
      ...restConfig
    } = finalConfig;

    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    // Prepare headers
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      'X-Request-ID': requestId,
    };

    // Add Content-Type for JSON bodies
    const isFormData = body instanceof FormData;
    if (body && !isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Merge with config headers
    if (configHeaders) {
      Object.assign(
        headers,
        configHeaders instanceof Headers
          ? Object.fromEntries(configHeaders.entries())
          : configHeaders
      );
    }

    // Prepare body
    const processedBody = body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined;

    // Execute request with retry logic
    let lastError: ApiError | null = null;
    const maxAttempts = skipRetry ? 1 : retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.executeRequest<T>(
          fullUrl,
          {
            ...restConfig,
            headers,
            body: processedBody as BodyInit | undefined,
            credentials: restConfig.credentials ?? 'include',
          },
          timeout,
          requestId,
          finalConfig
        );

        // Apply response interceptors
        let finalResult = result;
        for (const interceptor of this.responseInterceptors) {
          finalResult = (await interceptor(finalResult, finalConfig)) as Awaited<T>;
        }

        return finalResult;
      } catch (error) {
        lastError =
          error instanceof ApiError
            ? error
            : new ApiError({
                message:
                  error instanceof Error ? error.message : 'Unknown error',
                code: ErrorCodes.INTERNAL_ERROR,
                statusCode: 500,
              });

        // Check if we should retry
        if (attempt < maxAttempts - 1 && lastError.isRetryable && !skipRetry) {
          // Exponential backoff with jitter
          const delay =
            retryDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          await this.sleep(delay);
          continue;
        }

        // Apply error interceptors
        for (const interceptor of this.errorInterceptors) {
          lastError = await interceptor(lastError, finalConfig);
        }

        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * Execute a single request attempt
   */
  private async executeRequest<T>(
    url: string,
    init: RequestInit,
    timeout: number,
    requestId: string,
    originalConfig: RequestConfig
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge with external signal if provided
    const signal = originalConfig.signal;
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const data = await this.parseResponse<ApiResponse<T>>(response);

      // Check for API error response
      if (!response.ok || (data && 'success' in data && data.success === false)) {
        const errorData = data as ApiErrorResponse;
        throw new ApiError({
          message: errorData?.error?.message || response.statusText || 'Request failed',
          code: errorData?.error?.code || this.getErrorCodeFromStatus(response.status),
          statusCode: response.status,
          details: errorData?.error?.details,
          requestId: errorData?.error?.requestId || requestId,
          timestamp: errorData?.error?.timestamp,
        });
      }

      // Extract data from success response
      if (data && 'success' in data && data.success === true) {
        return data.data;
      }

      // Return raw data if not in standard format
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        // Check if it was user-initiated abort or timeout
        if (signal?.aborted) {
          throw new ApiError({
            message: 'Request was aborted',
            code: ErrorCodes.ABORTED,
            statusCode: 0,
            requestId,
          });
        }
        throw new ApiError({
          message: `Request timed out after ${timeout}ms`,
          code: ErrorCodes.TIMEOUT_ERROR,
          statusCode: 408,
          requestId,
        });
      }

      // Network or other errors
      throw new ApiError({
        message: error instanceof Error ? error.message : 'Network error',
        code: ErrorCodes.NETWORK_ERROR,
        statusCode: 0,
        requestId,
      });
    }
  }

  /**
   * Parse response body
   */
  private async parseResponse<T>(response: Response): Promise<T | null> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    // For non-JSON responses, return text as-is
    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * Map HTTP status to error code
   */
  private getErrorCodeFromStatus(status: number): ErrorCode {
    const statusMap: Record<number, ErrorCode> = {
      400: ErrorCodes.BAD_REQUEST,
      401: ErrorCodes.UNAUTHORIZED,
      403: ErrorCodes.FORBIDDEN,
      404: ErrorCodes.NOT_FOUND,
      408: ErrorCodes.TIMEOUT_ERROR,
      409: ErrorCodes.CONFLICT,
      413: ErrorCodes.PAYLOAD_TOO_LARGE,
      429: ErrorCodes.RATE_LIMITED,
      500: ErrorCodes.INTERNAL_ERROR,
      502: ErrorCodes.SERVICE_UNAVAILABLE,
      503: ErrorCodes.SERVICE_UNAVAILABLE,
      504: ErrorCodes.TIMEOUT_ERROR,
    };

    return statusMap[status] || ErrorCodes.INTERNAL_ERROR;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // HTTP Method Shortcuts
  // ===========================================================================

  /**
   * GET request
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(url, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Set base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set default header
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * Set authorization header (Bearer token)
   */
  setAuthToken(token: string): void {
    this.setDefaultHeader('Authorization', `Bearer ${token}`);
  }

  /**
   * Clear authorization header
   */
  clearAuthToken(): void {
    this.removeDefaultHeader('Authorization');
  }
}

// =============================================================================
// Default Instance & Exports
// =============================================================================

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Convenience methods using default instance
 */
export const api = {
  get: <T>(url: string, config?: RequestConfig) =>
    apiClient.get<T>(url, config),
  post: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    apiClient.post<T>(url, body, config),
  put: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    apiClient.put<T>(url, body, config),
  patch: <T>(url: string, body?: unknown, config?: RequestConfig) =>
    apiClient.patch<T>(url, body, config),
  delete: <T>(url: string, config?: RequestConfig) =>
    apiClient.delete<T>(url, config),
  request: <T>(url: string, config?: RequestConfig) =>
    apiClient.request<T>(url, config),
};

/**
 * Create a new API client instance with custom configuration
 */
export function createApiClient(config?: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

// Export the class for extension
export { ApiClient };
