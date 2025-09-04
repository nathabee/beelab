// src/utils/jwt.ts

import { jwtDecode } from 'jwt-decode';
import { useAuth } from '@context/AuthContext';

/**
 * Interface for JWT Payload
 */
interface JwtPayload {
  exp: number; // Expiration time
  iat?: number; // Issued at time (optional)
  [key: string]: unknown; // Additional properties allowed
}

/**
 * Checks if the JWT token is expired.
 * 
 * @param {string} token - The JWT token string.
 * @returns {boolean} - True if the token is expired or invalid, false otherwise.
 */

 

export function isTokenExpired(token: string): boolean {
  if (!token) return true;

  try {
    // Decode the JWT with the JwtPayload type to prevent 'any' issues
    const decodedToken: JwtPayload = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000; // JWT exp is in seconds
    return decodedToken.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true; // Treat token as expired if decoding fails
  }
}

/**
 * Extracts the 'authToken' from the cookies string. ++++changed take it from context
 *  
 * @returns {string | null} - The 'authToken' if found and valid, or null if not present or expired.
 */
export function getToken(): string | null {
  const { token } = useAuth();
  if (typeof window === 'undefined') return null;

  //const token = localStorage.getItem('authToken');
  return token && !isTokenExpired(token) ? token : null;
}
