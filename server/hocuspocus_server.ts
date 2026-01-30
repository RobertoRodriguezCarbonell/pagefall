import 'dotenv/config'
import { Server } from '@hocuspocus/server'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { db } from './db.js'
import { notes } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// Configure the server with database persistence
const server = new Server({
  port: 1234,
  
  // Load document from database when a client connects
  async onLoadDocument(data) {
    const noteId = data.documentName
    console.log(`📖 Loading document: ${noteId}`)

    try {
      const note = await db.query.notes.findFirst({
        where: eq(notes.id, noteId)
      })
      
      if (note?.content) {
        console.log(`✅ Document loaded from database: ${noteId}`)
        // Convert the JSON content from DB to Y.js document
        return TiptapTransformer.toYdoc(note.content, 'default')
      }
      
      console.log(`📝 New document (empty): ${noteId}`)
      return null
    } catch (error) {
      console.error(`❌ Error loading document ${noteId}:`, error)
      return null
    }
  },

  // Save document to database after changes (debounced by default 2 seconds)
  async onStoreDocument(data) {
    const noteId = data.documentName
    console.log(`💾 Saving document: ${noteId}`)

    try {
      // Convert Y.js document to JSON for database storage
      const json = TiptapTransformer.fromYdoc(data.document, 'default')

      await db.update(notes)
        .set({ 
          content: json,
          updatedAt: new Date()
        })
        .where(eq(notes.id, noteId))
      
      console.log(`✅ Document saved to database: ${noteId}`)
    } catch (error) {
      console.error(`❌ Error saving document ${noteId}:`, error)
    }
  },

  onConnect: async (data) => {
    console.log(`🔌 Client connected: ${data.documentName}`)
  },

  onDisconnect: async (data) => {
    console.log(`🔌 Client disconnected: ${data.documentName}`)
  },
})

// Start the server
server.listen().then(() => {
  console.log('🚀 Hocuspocus WebSocket server is running on ws://localhost:1234')
  console.log('📊 Database persistence enabled')
})