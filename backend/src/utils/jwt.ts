import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserTokenPayload } from '../types/index.js';

export function generateToken(payload: UserTokenPayload): string {
  // @ts-expect-error jsonwebtoken types mismatch for expiresIn string
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token: string): UserTokenPayload {
  return jwt.verify(token, config.jwtSecret) as UserTokenPayload;
}
