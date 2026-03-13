import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser, UserRole } from "../lib/types";

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }

  return jwtSecret;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie("token");
}

function getToken(request: Request) {
  const authorization = request.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return request.cookies?.token;
}

export function requireAuth(roles?: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const token = getToken(request);

    if (!token) {
      return response.status(401).json({ message: "Authentication required." });
    }

    try {
      const user = jwt.verify(token, getJwtSecret()) as AuthUser;
      request.user = user;

      if (roles && !roles.includes(user.role)) {
        return response.status(403).json({ message: "You do not have access to this resource." });
      }

      return next();
    } catch {
      return response.status(401).json({ message: "Invalid or expired session." });
    }
  };
}