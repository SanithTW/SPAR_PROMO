import sql from 'mssql';
import '../../config/index.js'; // loads .env
import { ExternalApiError } from '../common/apiErrors.js';
import { integrationLogger } from '../common/logger.js';

const SERVICE = 'Microsoft Fabric';

/**
 * Settings for the Fabric Warehouse / Lakehouse SQL analytics endpoint.
 * Fabric only accepts Microsoft Entra ID logins, so the backend signs in as an
 * app registration (service principal) with a client secret.
 */
export const fabricConfig = {
  server: (process.env.FABRIC_SQL_SERVER || '').trim(),
  database: (process.env.FABRIC_SQL_DATABASE || '').trim(),
  tenantId: (process.env.FABRIC_TENANT_ID || '').trim(),
  clientId: (process.env.FABRIC_CLIENT_ID || '').trim(),
  clientSecret: process.env.FABRIC_CLIENT_SECRET || '',
  timeout: parseInt(process.env.FABRIC_SQL_TIMEOUT || '30000', 10),
};

export type FabricHealthStatus = 'not_configured' | 'connected' | 'disconnected';

export interface FabricTable {
  schema: string;
  name: string;
  type: 'TABLE' | 'VIEW' | string;
}

export interface FabricColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

/** Quote a SQL Server identifier: my]table -> [my]]table] */
function quoteIdent(name: string): string {
  return `[${name.replace(/]/g, ']]')}]`;
}

class FabricClient {
  private pool: sql.ConnectionPool | null = null;
  private connecting: Promise<sql.ConnectionPool> | null = null;

  /** Names of the FABRIC_* settings that are still empty. */
  public missingSettings(): string[] {
    const required: Record<string, string> = {
      FABRIC_SQL_SERVER: fabricConfig.server,
      FABRIC_SQL_DATABASE: fabricConfig.database,
      FABRIC_TENANT_ID: fabricConfig.tenantId,
      FABRIC_CLIENT_ID: fabricConfig.clientId,
      FABRIC_CLIENT_SECRET: fabricConfig.clientSecret,
    };
    return Object.entries(required)
      .filter(([, v]) => !v)
      .map(([k]) => k);
  }

  public isConfigured(): boolean {
    return this.missingSettings().length === 0;
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    if (!this.isConfigured()) {
      throw new ExternalApiError(
        SERVICE,
        `Fabric is not configured. Missing in backend/.env: ${this.missingSettings().join(', ')}`,
        503
      );
    }
    if (this.pool?.connected) return this.pool;
    if (this.connecting) return this.connecting;

    const pool = new sql.ConnectionPool({
      server: fabricConfig.server,
      port: 1433,
      database: fabricConfig.database,
      connectionTimeout: fabricConfig.timeout,
      requestTimeout: fabricConfig.timeout,
      pool: { max: 5, min: 0, idleTimeoutMillis: 60000 },
      options: { encrypt: true, trustServerCertificate: false },
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          tenantId: fabricConfig.tenantId,
          clientId: fabricConfig.clientId,
          clientSecret: fabricConfig.clientSecret,
        },
      },
    });

    pool.on('error', () => {
      this.pool = null;
    });

    this.connecting = pool
      .connect()
      .then((p) => {
        this.pool = p;
        return p;
      })
      .catch((err: Error) => {
        this.pool = null;
        throw new ExternalApiError(SERVICE, `Could not connect to Fabric: ${err.message}`, 502);
      })
      .finally(() => {
        this.connecting = null;
      });

    return this.connecting;
  }

  /**
   * Run a parameterised read query. Always pass user values through `params`
   * (referenced as @name in the SQL) — never build them into the SQL text.
   */
  public async query<T = Record<string, unknown>>(
    label: string,
    text: string,
    params: Record<string, string | number | boolean | Date | null> = {}
  ): Promise<T[]> {
    const start = Date.now();
    integrationLogger.requestStarted(SERVICE, 'SQL', label);
    const pool = await this.getPool();
    try {
      const request = pool.request();
      for (const [name, value] of Object.entries(params)) request.input(name, value);
      const result = await request.query<T>(text);
      integrationLogger.requestSuccess(SERVICE, 'SQL', label, 200, Date.now() - start);
      return result.recordset;
    } catch (err) {
      integrationLogger.requestError(SERVICE, 'SQL', label, 'QUERY_FAILED', Date.now() - start);
      throw new ExternalApiError(SERVICE, `Fabric query failed (${label}): ${(err as Error).message}`, 502);
    }
  }

  public async checkHealth(): Promise<{ status: FabricHealthStatus; message?: string }> {
    if (!this.isConfigured()) {
      return { status: 'not_configured', message: `Missing: ${this.missingSettings().join(', ')}` };
    }
    try {
      await this.query('health', 'SELECT 1 AS ok');
      return { status: 'connected' };
    } catch (err) {
      return { status: 'disconnected', message: (err as Error).message };
    }
  }

  /** All user tables and views in the Fabric database. */
  public async listTables(): Promise<FabricTable[]> {
    return this.query<FabricTable>(
      'list tables',
      `SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS name, TABLE_TYPE AS type
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA', 'queryinsights')
        ORDER BY TABLE_SCHEMA, TABLE_NAME`
    );
  }

  public async listColumns(schema: string, table: string): Promise<FabricColumn[]> {
    const rows = await this.query<{ name: string; dataType: string; nullable: string }>(
      'list columns',
      `SELECT COLUMN_NAME AS name, DATA_TYPE AS dataType, IS_NULLABLE AS nullable
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION`,
      { schema, table }
    );
    return rows.map((r) => ({ name: r.name, dataType: r.dataType, nullable: r.nullable === 'YES' }));
  }

  /** First rows of a table or view. The name is checked against INFORMATION_SCHEMA first. */
  public async previewTable(schema: string, table: string, limit = 50): Promise<Record<string, unknown>[]> {
    const exists = await this.query(
      'check table',
      `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table`,
      { schema, table }
    );
    if (exists.length === 0) {
      throw new ExternalApiError(SERVICE, `Table ${schema}.${table} was not found in Fabric.`, 404);
    }
    const top = Math.min(Math.max(Math.floor(limit) || 50, 1), 500);
    return this.query(
      'preview table',
      `SELECT TOP (@top) * FROM ${quoteIdent(schema)}.${quoteIdent(table)}`,
      { top }
    );
  }

  public async close(): Promise<void> {
    await this.pool?.close();
    this.pool = null;
  }
}

export const fabricClient = new FabricClient();
