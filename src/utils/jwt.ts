import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

export interface DecodedToken extends JwtPayload {
    iat: number;
    exp: number;
}

/**
 * Generate a JWT token with user payload
 * Token expires based on JWT_EXPIRES_IN env variable (default: 24h)
 */
export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: '24h',
    });
}

/**
 * Verify and decode a JWT token
 * Returns the decoded payload or throws an error if invalid
 */
export function verifyToken(token: string): DecodedToken {
    return jwt.verify(token, env.JWT_SECRET) as DecodedToken;
}

/**
 * Decode a token without verifying (for debugging)
 */
export function decodeToken(token: string): DecodedToken | null {
    return jwt.decode(token) as DecodedToken | null;
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
