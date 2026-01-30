import { Server } from '@hocuspocus/server'

// Configure the server
const server = new Server({
  port: 1234,
  onConnect: async (data) => {
    console.log(`Client connected: ${data.documentName}`)
  },
})

// Star the server
server.listen().then(() => {
  console.log('Hocuspocus WebSocket server is running on ws://localhost:1234')
})