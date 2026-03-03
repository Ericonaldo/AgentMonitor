import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { relayConfig } from './config.js';

const JWT_EXPIRY = '24h';

function getJwtSecret(): string {
  return relayConfig.token;
}

/** Create auth routes: login, logout, session check */
export function createAuthRoutes(): Router {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', (req: Request, res: Response) => {
    const { password } = req.body ?? {};
    if (!relayConfig.password) {
      // No password configured — auth disabled, shouldn't reach here
      return res.json({ ok: true });
    }
    if (password !== relayConfig.password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ relay: true }, getJwtSecret(), { expiresIn: JWT_EXPIRY });
    res.cookie('relay_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    return res.json({ ok: true });
  });

  // GET /api/auth/check
  router.get('/check', (req: Request, res: Response) => {
    if (!relayConfig.password) {
      return res.json({ authenticated: true });
    }
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }
    try {
      jwt.verify(token, getJwtSecret());
      return res.json({ authenticated: true });
    } catch {
      return res.status(401).json({ authenticated: false });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('relay_token', { path: '/' });
    return res.json({ ok: true });
  });

  return router;
}

/** Extract JWT token from cookie or Authorization header */
function extractToken(req: Request): string | null {
  // Cookie first
  const cookieToken = req.cookies?.relay_token;
  if (cookieToken) return cookieToken;

  // Authorization: Bearer <token> fallback
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/** Middleware: require valid JWT for protected routes */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!relayConfig.password) {
    // No password set — auth disabled, allow all
    next();
    return;
  }

  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Verify a JWT token string (for Socket.IO auth) */
export function verifyToken(token: string): boolean {
  if (!relayConfig.password) return true;
  try {
    jwt.verify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}
