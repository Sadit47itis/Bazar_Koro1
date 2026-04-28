import type { Request, Response } from 'express'
import { z } from 'zod'
import type { UserRole } from '@bazar-koro/shared'

import { hashPassword, signToken, verifyPassword } from '../auth.js'
import { createUser, getUserByEmail, getUserById, addRoleToUser } from '../storage.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../env.js'

const googleClient = new OAuth2Client(env.googleClientId)

const rolesSchema = z.array(z.enum(['buyer', 'seller', 'driver', 'marketer', 'admin'] as const)).min(1)

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  roles: rolesSchema,
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function registerRoute(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  try {
    const existing = await getUserByEmail(parsed.data.email)
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await hashPassword(parsed.data.password)
    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      roles: parsed.data.roles as UserRole[],
      passwordHash,
    })

    const token = signToken(user)
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, roles: user.roles, adPoints: user.adPoints } })
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export async function loginRoute(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  try {
    const user = await getUserByEmail(parsed.data.email)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await verifyPassword(parsed.data.password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user)
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, roles: user.roles, adPoints: user.adPoints } })
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export async function googleLoginRoute(req: Request, res: Response) {
  const parsed = z.object({ idToken: z.string() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: env.googleClientId,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) return res.status(401).json({ error: 'Invalid Google token' })

    let user = await getUserByEmail(payload.email)
    if (!user) {
      // Create user if they don't exist, default role 'buyer'
      const randomPasswordLog = Math.random().toString(36).slice(-8)
      const passwordHash = await hashPassword(randomPasswordLog)
      user = await createUser({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        roles: ['buyer'],
        passwordHash,
      })
    }

    const token = signToken(user)
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, roles: user.roles, adPoints: user.adPoints } })
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export async function meRoute(req: AuthedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const user = await getUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({ id: user.id, name: user.name, email: user.email, roles: user.roles, adPoints: user.adPoints, activeRole: req.user.activeRole })
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}

export async function addRoleRoute(req: AuthedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  
  const parsed = z.object({ role: rolesSchema.element }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role', details: parsed.error.flatten() })

  try {
    await addRoleToUser(req.user.id, parsed.data.role)
    const updatedUser = await getUserById(req.user.id)
    if (!updatedUser) return res.status(404).json({ error: 'User not found' })
    
    // We also sign a new token with the updated roles just in case, though current logic doesn't strictly require it
    const token = signToken(updatedUser)
    
    return res.json({ 
      token, 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        roles: updatedUser.roles,
        adPoints: updatedUser.adPoints 
      } 
    })
  } catch (error: any) {
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
}
