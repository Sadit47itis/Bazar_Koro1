import { nanoid } from 'nanoid'
import type { Order, UserPublic, UserRole } from '@bazar-koro/shared'
import { User } from './models/User.js'

export interface UserRecord extends UserPublic {
  passwordHash: string
  isOnline?: boolean
  adPoints?: number
}

const ordersById = new Map<string, Order>()

export async function createUser(input: {
  name: string
  email: string
  roles: UserRole[]
  passwordHash: string
}): Promise<UserRecord> {
  const user = new User({
    name: input.name,
    email: input.email.toLowerCase(),
    roles: input.roles,
    passwordHash: input.passwordHash,
    isOnline: false,
  })
  const saved = await user.save()
  return {
    id: saved._id.toString(),
    name: saved.name,
    email: saved.email,
    roles: saved.roles as UserRole[],
    passwordHash: saved.passwordHash,
    isOnline: saved.isOnline,
    adPoints: saved.adPoints,
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return undefined
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles as UserRole[],
    passwordHash: user.passwordHash,
    isOnline: user.isOnline,
    adPoints: user.adPoints,
  }
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const user = await User.findById(id)
  if (!user) return undefined
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles as UserRole[],
    passwordHash: user.passwordHash,
    isOnline: user.isOnline,
    adPoints: user.adPoints,
  }
}

export async function addRoleToUser(id: string, role: UserRole): Promise<void> {
  await User.findByIdAndUpdate(id, { $addToSet: { roles: role } })
}

export function createOrder(input: {
  buyerId: string
  lines: Order['lines']
  storeIds: string[]
}): Order {
  const now = new Date().toISOString()
  const id = nanoid()
  const order: Order = {
    id,
    buyerId: input.buyerId,
    lines: input.lines,
    storeIds: input.storeIds,
    status: 'placed',
    createdAt: now,
    updatedAt: now,
  }
  ordersById.set(id, order)
  return order
}

export function getOrderById(id: string): Order | undefined {
  return ordersById.get(id)
}

export function updateOrder(order: Order): Order {
  ordersById.set(order.id, { ...order, updatedAt: new Date().toISOString() })
  return ordersById.get(order.id)!
}

export function listOrdersForBuyer(buyerId: string): Order[] {
  return [...ordersById.values()].filter((o) => o.buyerId === buyerId)
}
