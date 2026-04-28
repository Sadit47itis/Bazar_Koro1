
import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  fromEmail: process.env.FROM_EMAIL ?? '',
  mongoUri: process.env.MONGODB_URI ?? '',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  googleClientId: process.env.OUTH_GOOGLE_CLIENT_ID ?? '',
  clientBaseUrl: process.env.CLIENT_BASE_URL ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const
