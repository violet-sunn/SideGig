import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const { storage } = await import("./storage");
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// IP Whitelist for admin access (development environment only for security)
const ALLOWED_ADMIN_IPS = [
  '127.0.0.1',          // Local development
  '::1',                // Local IPv6
  '0.0.0.0',            // Replit development
  'localhost'           // Local hostname
];

// Check if request comes from allowed IP for admin access
const isAllowedAdminIP = (req: any): boolean => {
  // In development, allow all IPs (Replit environment)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  const clientIP = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const forwardedIPs = req.headers['x-forwarded-for'];
  
  // Check direct IP
  if (clientIP && ALLOWED_ADMIN_IPS.some(allowedIP => 
    clientIP.includes(allowedIP) || clientIP === allowedIP
  )) {
    return true;
  }
  
  // Check forwarded IPs
  if (forwardedIPs) {
    const ips = Array.isArray(forwardedIPs) ? forwardedIPs : [forwardedIPs];
    return ips.some(ip => 
      ALLOWED_ADMIN_IPS.some(allowedIP => 
        ip.includes(allowedIP) || ip === allowedIP
      )
    );
  }
  
  return false;
};

// Middleware for moderators (can view admin info but limited actions)
export const isModerator: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // IP-based security check
  if (!isAllowedAdminIP(req)) {
    console.warn(`Moderator access denied from IP: ${req.ip}, User: ${user.claims.sub}`);
    return res.status(403).json({ message: "Forbidden: Access denied from this location" });
  }

  try {
    const { storage } = await import("./storage");
    const userId = user.claims.sub;
    const userData = await storage.getUser(userId);
    
    if (!userData || (userData.role !== "moderator" && userData.role !== "admin")) {
      return res.status(403).json({ message: "Forbidden: Moderator or Admin access required" });
    }

    if (userData.isBlocked) {
      return res.status(403).json({ message: "Forbidden: Account is blocked" });
    }

    // Add user role to request for further checks
    (req as any).userRole = userData.role;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  console.log("Debug: isAdmin check for user:", user?.claims?.sub);

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("Debug: Admin access denied - not authenticated or no expires_at");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Additional IP-based security check for production
  if (!isAllowedAdminIP(req)) {
    console.warn(`Admin access denied from IP: ${req.ip}, User: ${user.claims.sub}`);
    return res.status(403).json({ message: "Forbidden: Access denied from this location" });
  }

  try {
    const { storage } = await import("./storage");
    const userId = user.claims.sub;
    console.log("Debug: Checking admin access for userId:", userId);
    const userData = await storage.getUser(userId);
    console.log("Debug: User data found:", userData ? `${userData.firstName} ${userData.lastName}, role: ${userData.role}` : "null");
    
    if (!userData || userData.role !== "admin") {
      console.log("Debug: Admin access denied - user not found or role not admin, actual role:", userData?.role);
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    // Check if admin account is blocked
    if (userData.isBlocked) {
      console.log("Debug: Admin access denied - account is blocked");
      return res.status(403).json({ message: "Forbidden: Admin account is blocked" });
    }

    console.log("Debug: Admin access granted for user:", userData.firstName, userData.lastName);
    return next();
  } catch (error) {
    console.error("Debug: Admin middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
