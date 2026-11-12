import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PRODUCT_MASTER_API_URL',
  'PRODUCT_MASTER_API_USERNAME',
  'PRODUCT_MASTER_API_PASSWORD',
  'SALES_API_URL',
  'SALES_API_USERNAME',
  'SALES_API_PASSWORD',
] as const;

export function validateEnv(): void {
  const missing = requiredEnvVars.filter((v) => !process.env[v] || process.env[v]!.trim() === '');
  if (missing.length > 0) {
    const errorMsg = `[CONFIG ERROR] Missing required environment variable(s): ${missing.join(', ')}. Please check your .env file.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Perform environment validation at load time
validateEnv();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'spar-default-dev-secret-key-replace-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  devSeedPassword: process.env.DEV_SEED_PASSWORD || 'Password123!',

  // External APIs
  productMaster: {
    url: process.env.PRODUCT_MASTER_API_URL || 'http://localhost:8001',
    username: process.env.PRODUCT_MASTER_API_USERNAME || '',
    password: process.env.PRODUCT_MASTER_API_PASSWORD || '',
    timeout: parseInt(process.env.PRODUCT_MASTER_API_TIMEOUT || '10000', 10),
  },
  sales: {
    url: process.env.SALES_API_URL || 'http://localhost:8000',
    username: process.env.SALES_API_USERNAME || '',
    password: process.env.SALES_API_PASSWORD || '',
    timeout: parseInt(process.env.SALES_API_TIMEOUT || '10000', 10),
  },
};
