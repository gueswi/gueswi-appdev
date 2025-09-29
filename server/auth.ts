import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle both old format (hash only) and new format (hash.salt)
  if (stored.includes(".")) {
    // New format: hash.salt
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Old format: Try multiple approaches for legacy passwords
    
    // Try bcrypt-style comparison (common legacy format)
    try {
      return await bcrypt.compare(supplied, stored);
    } catch (error: any) {
      // If bcrypt fails, try simple hash comparison
      console.log('🔍 Bcrypt failed, trying simple hash:', error.message);
    }
    
    // Try direct comparison for very old simple hashes
    const hash = createHash('sha256').update(supplied).digest('hex');
    if (hash === stored) return true;
    
    // Try MD5 (another common legacy format)
    const md5Hash = createHash('md5').update(supplied).digest('hex');
    if (md5Hash === stored) return true;
    
    console.log('🔍 All legacy password attempts failed for format:', stored.substring(0, 20) + '...');
    return false;
  }
}

export function setupAuth(app: Express) {
  // AUTH HARDENING: Session configuration with explicit settings
  const sessionSettings: session.SessionOptions = {
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 1000*60*60*24, // 24 hours
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        console.log('🔍 LocalStrategy attempt:', { email, passwordProvided: !!password });
        try {
          const user = await storage.getUserByEmail(email);
          console.log('🔍 User found:', !!user);
          
          if (!user) {
            console.log('❌ User not found');
            return done(null, false, { message: 'User not found' });
          }
          
          const passwordMatch = await comparePasswords(password, user.password);
          console.log('🔍 Password match:', passwordMatch);
          
          if (!passwordMatch) {
            console.log('❌ Password mismatch');
            return done(null, false, { message: 'Invalid password' });
          }
          
          console.log('✅ Authentication successful');
          return done(null, user);
        } catch (error) {
          console.log('❌ Error in auth:', error);
          return done(error);
        }
      },
    ),
  );

  // AUTH HARDENING: Enhanced serialization with tenant data
  passport.serializeUser((user, done) => done(null, { id: user.id, tenantId: user.tenantId, role: user.role }));
  passport.deserializeUser(async (userData: any, done) => {
    try {
      const user = await storage.getUser(userData.id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).send("Email already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // AUTH HARDENING: Robust login route with explicit callback
  app.post('/api/login', (req, res, next) => {
    console.log('🔍 Login attempt:', { email: req.body.email, passwordProvided: !!req.body.password });
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      console.log('🔍 Auth result:', { err: !!err, user: !!user, info });
      
      if (err) return next(err);
      if (!user) return res.status(401).json({ ok: false, reason: info?.message || 'INVALID' });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Debug session info
        console.log('🔍 sessionID after login:', req.sessionID);
        console.log('🔍 session.passport:', (req.session as any)?.passport);
        
        return res.status(200).json({ ok: true });
      });
    })(req, res, next);
  });

  // AUTH HARDENING: Enhanced logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  });

  // AUTH HARDENING: Debug endpoint
  app.get("/api/debug/session", (req, res) => {
    res.json({
      sessionID: req.sessionID,
      passport: (req.session as any)?.passport,
      isAuth: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, email: req.user.email } : null
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
