import { config } from '../../config/index.js';
import { ExternalApiError } from '../common/apiErrors.js';
import { integrationLogger } from '../common/logger.js';
import {
  PMProductSummary,
  PMProductDetail,
  PMPaginatedResponse,
  PMSearchParams,
} from './productMaster.types.js';

class ProductMasterClient {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private get baseUrl(): string {
    return config.productMaster.url.replace(/\/+$/, '');
  }

  private get timeoutMs(): number {
    return config.productMaster.timeout || 10000;
  }

  /**
   * Authenticate against Product Master OAuth2 password endpoint.
   */
  public async login(): Promise<string> {
    const start = Date.now();
    const endpoint = '/auth/login';
    integrationLogger.requestStarted('Product Master', 'POST', endpoint);

    const body = new URLSearchParams({
      username: config.productMaster.username,
      password: config.productMaster.password,
    });

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      const duration = Date.now() - start;
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        integrationLogger.requestError('Product Master', 'POST', endpoint, 'TIMEOUT', duration);
        throw new ExternalApiError('Product Master', 'Product Master service timed out.', 504);
      }
      integrationLogger.requestError('Product Master', 'POST', endpoint, 'NETWORK_ERROR', duration);
      throw new ExternalApiError('Product Master', 'Product Master service is unavailable.', 503);
    }

    const duration = Date.now() - start;
    if (!res.ok) {
      integrationLogger.requestError('Product Master', 'POST', endpoint, `HTTP_${res.status}`, duration);
      if (res.status === 401 || res.status === 403) {
        throw new ExternalApiError('Product Master', 'Product Master service authentication failed.', 502);
      }
      throw new ExternalApiError('Product Master', 'Product Master service is unavailable.', 502);
    }

    try {
      const data = (await res.json()) as { access_token: string; token_type: string; expires_in?: number };
      this.cachedToken = data.access_token;
      // Default to 15 minutes validity
      const expiresInSec = data.expires_in || 900;
      this.tokenExpiresAt = Date.now() + (expiresInSec - 60) * 1000;
      integrationLogger.requestSuccess('Product Master', 'POST', endpoint, res.status, duration);
      return this.cachedToken;
    } catch {
      throw new ExternalApiError('Product Master', 'Invalid response from Product Master service.', 502);
    }
  }

  /**
   * Retrieve a valid Bearer token, reusing cached token if unexpired.
   */
  private async getValidToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    return this.login();
  }

  /**
   * Internal request helper with authorization, timeout, retry on 401, and safe logging.
   */
  public async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const token = await this.getValidToken();
    const start = Date.now();
    const method = options.method || 'GET';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    integrationLogger.requestStarted('Product Master', method, cleanEndpoint);

    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      const duration = Date.now() - start;
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        integrationLogger.requestError('Product Master', method, cleanEndpoint, 'TIMEOUT', duration);
        throw new ExternalApiError('Product Master', 'Product Master service timed out.', 504);
      }
      integrationLogger.requestError('Product Master', method, cleanEndpoint, 'CONNECTION_ERROR', duration);
      throw new ExternalApiError('Product Master', 'Product Master service is unavailable.', 503);
    }

    const duration = Date.now() - start;

    // Retry once if token was expired
    if (res.status === 401 && !isRetry) {
      this.cachedToken = null;
      return this.request<T>(endpoint, options, true);
    }

    if (!res.ok) {
      integrationLogger.requestError('Product Master', method, cleanEndpoint, `HTTP_${res.status}`, duration);
      if (res.status === 404) {
        throw new ExternalApiError('Product Master', 'Product not found in Product Master.', 404);
      }
      if (res.status === 400 || res.status === 422) {
        throw new ExternalApiError('Product Master', 'Invalid product parameter in Product Master.', 400);
      }
      if (res.status === 401 || res.status === 403) {
        throw new ExternalApiError('Product Master', 'Product Master authorization failed.', 502);
      }
      throw new ExternalApiError('Product Master', 'Product Master service returned an error.', 502);
    }

    try {
      const data = (await res.json()) as T;
      integrationLogger.requestSuccess('Product Master', method, cleanEndpoint, res.status, duration);
      return data;
    } catch {
      throw new ExternalApiError('Product Master', 'Unexpected response structure from Product Master service.', 502);
    }
  }

  /**
   * Search products via Product Master /products endpoint.
   */
  public async searchProducts(params: PMSearchParams = {}): Promise<PMPaginatedResponse<PMProductSummary>> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.dep_code) query.append('dep_code', params.dep_code);
    if (params.barcode) query.append('barcode', params.barcode);
    if (params.supplier_order_active !== undefined) {
      query.append('supplier_order_active', String(params.supplier_order_active));
    }
    query.append('limit', String(params.limit || 30));
    query.append('offset', String(params.offset || 0));

    return this.request<PMPaginatedResponse<PMProductSummary>>(`/products?${query.toString()}`);
  }

  /**
   * Fetch single product detail by 8-digit product code.
   */
  public async getProductByCode(proCode: string): Promise<PMProductDetail | null> {
    try {
      const clean = proCode.trim();
      // Fast check: Product Master product codes are numeric (up to 8 digits)
      if (!/^\d{1,8}$/.test(clean)) {
        return null;
      }
      const formattedCode = clean.padStart(8, '0');
      return await this.request<PMProductDetail>(`/products/code/${encodeURIComponent(formattedCode)}`);
    } catch (err: unknown) {
      if (err instanceof ExternalApiError && (err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 422)) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Safe health check of Product Master connectivity without exposing credentials.
   */
  public async checkHealth(): Promise<{ status: 'connected' | 'unavailable'; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 3000)),
      });
      if (res.ok) {
        return { status: 'connected', latencyMs: Date.now() - start };
      }
      return { status: 'unavailable' };
    } catch {
      return { status: 'unavailable' };
    }
  }
}

export const productMasterClient = new ProductMasterClient();
