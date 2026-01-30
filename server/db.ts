import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../db/schema.js'

// Cliente para Neon HTTP (base de datos en la nube)
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
