import 'dotenv/config';
import mongoose from 'mongoose'
import { createApp } from './app.js'
import { env } from './env.js'
import { User } from './models/User.js'
import { hashPassword } from './auth.js'

async function seedSuperAdmin() {
  try {
    const existing = await User.findOne({ email: 'irtizajabir1@gmail.com' })
    if (!existing) {
      const passwordHash = await hashPassword('1212IJC')
      const superAdmin = new User({
        name: 'Super Admin',
        email: 'irtizajabir1@gmail.com',
        passwordHash,
        roles: ['admin']
      })
      await superAdmin.save()
      console.log('Super admin created!')
    }
  } catch (e) {
    console.error('Failed to seed super admin:', e)
  }
}
import cron from 'node-cron'
import { sendWeeklyNewsletter } from './services/newsletter.js'

async function startServer() {
  if (!env.mongoUri) {
    console.error('Fatal: No MongoDB_URI provided in .env file. Exiting.')
    process.exit(1)
  }

  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: 50,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    })
    console.log('Connected to MongoDB')
    await seedSuperAdmin()
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1)
  }

  const app = createApp()

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.port}`)
  })

  // Schedule weekly newsletter every Sunday at 10 AM
  cron.schedule('0 10 * * 0', () => {
    console.log('Sending weekly newsletter...');
    sendWeeklyNewsletter();
  });
}

startServer()
