import { config } from '../../config/index.js';
import { ExternalApiError } from '../common/apiErrors.js';
import { integrationLogger } from '../common/logger.js';
import {
  SalesLineResponse,
  SalesPaginatedResponse,
  SalesFilterParams,
} from './sales.types.js';

class SalesClient {
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private get baseUrl(): string {
    return config.sales.url.replace(/\/+$/, '');
  }

  private get timeoutMs(): number {
    return config.sales.timeout || 10000;
  }

  /**
   * Authenticate against Sales API OAuth2 password endpoint.
   */
  public async login(): Promise<string> {
    const start = Date.now();
    const endpoint = '/auth/login';
    integrationLogger.requestStarted('Sales API', 'POST', endpoint);

    const body = new URLSearchParams({
      username: config.sales.username,
      password: config.sales.password,
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
        integrationLogger.requestError('Sales API', 'POST', endpoint, 'TIMEOUT', duration);
        throw new ExternalApiError('Sales API', 'Sales service timed out.', 504);
      }
      integrationLogger.requestError('Sales API', 'POST', endpoint, 'NETWORK_ERROR', duration);
      throw new ExternalApiError('Sales API', 'Sales service is unavailable.', 503);
    }

    const duration = Date.now() - start;
    if (!res.ok) {
      integrationLogger.requestError('Sales API', 'POST', endpoint, `HTTP_${res.status}`, duration);
      if (res.status === 401 || res.status === 403) {
        throw new ExternalApiError('Sales API', 'Sales service authentication failed.', 502);
      }
      throw new ExternalApiError('Sales API', 'Sales service is unavailable.', 502);
    }

    try {
      const data = (await res.json()) as { access_token: string; token_type: string; expires_in?: number };
      this.cachedToken = data.access_token;
      const expiresInSec = data.expires_in || 900;
      this.tokenExpiresAt = Date.now() + (expiresInSec - 60) * 1000;
      integrationLogger.requestSuccess('Sales API', 'POST', endpoint, res.status, duration);
      return this.cachedToken;
    } catch {
      throw new ExternalApiError('Sales API', 'Invalid response from Sales service.', 502);
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

    integrationLogger.requestStarted('Sales API', method, cleanEndpoint);

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
        integrationLogger.requestError('Sales API', method, cleanEndpoint, 'TIMEOUT', duration);
        throw new ExternalApiError('Sales API', 'Sales service timed out.', 504);
      }
      integrationLogger.requestError('Sales API', method, cleanEndpoint, 'CONNECTION_ERROR', duration);
      throw new ExternalApiError('Sales API', 'Sales service is unavailable.', 503);
    }

    const duration = Date.now() - start;

    if (res.status === 401 && !isRetry) {
      this.cachedToken = null;
      return this.request<T>(endpoint, options, true);
    }

    if (!res.ok) {
      integrationLogger.requestError('Sales API', method, cleanEndpoint, `HTTP_${res.status}`, duration);
      if (res.status === 404) {
        throw new ExternalApiError('Sales API', 'Sales data not found.', 404);
      }
      if (res.status === 401 || res.status === 403) {
        throw new ExternalApiError('Sales API', 'Sales service authorization failed.', 502);
      }
      throw new ExternalApiError('Sales API', 'Sales service returned an error.', 502);
    }

    try {
      const data = (await res.json()) as T;
      integrationLogger.requestSuccess('Sales API', method, cleanEndpoint, res.status, duration);
      return data;
    } catch {
      throw new ExternalApiError('Sales API', 'Unexpected response structure from Sales service.', 502);
    }
  }

  /**
   * Query sales lines with optional filters.
   */
  public async getSalesLines(params: SalesFilterParams = {}): Promise<SalesPaginatedResponse<SalesLineResponse>> {
    const query = new URLSearchParams();
    if (params.product_code) query.append('product_code', params.product_code);
    if (params.product_id) query.append('product_id', String(params.product_id));
    if (params.date_from) query.append('date_from', params.date_from);
    if (params.date_to) query.append('date_to', params.date_to);
    if (params.location_code) query.append('location_code', params.location_code);
    query.append('limit', String(params.limit || 50));
    query.append('offset', String(params.offset || 0));

    return this.request<SalesPaginatedResponse<SalesLineResponse>>(`/sales?${query.toString()}`);
  }

  /**
   * Health check connectivity.
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

export const salesClient = new SalesClient();
