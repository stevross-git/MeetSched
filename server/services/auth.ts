import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { storage } from '../storage';
import { users, userSessions, UserSession, User } from '../../shared/schema';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: UserSession;
    }
  }
}

export class AuthService {
  // Generate secure session token
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create user session
  static async createSession(userId: string): Promise<string> {
    const token = this.generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await storage.createUserSession({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  // Validate session token
  static async validateSession(token: string): Promise<{ user: User; session: UserSession } | null> {
    try {
      const sessionData = await storage.validateUserSession(token);
      return sessionData;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout user (delete session)
  static async logout(token: string): Promise<void> {
    await storage.deleteUserSession(token);
  }

  // Create or find user by email (simple auth for demo)
  static async findOrCreateUser(email: string, name: string): Promise<User> {
    try {
      const user = await storage.findOrCreateUser(email, name);
      return user;
    } catch (error) {
      console.error('User creation/lookup error:', error);
      throw error;
    }
  }
}

// Authentication middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionData = await AuthService.validateSession(token);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = sessionData.user;
    req.session = sessionData.session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Optional auth middleware (doesn't block if no auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        const sessionData = await AuthService.validateSession(token);
        if (sessionData) {
          req.user = sessionData.user;
          req.session = sessionData.session;
        }
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if auth fails
  }
};