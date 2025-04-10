import { createApp } from './app';

/**
 * Server entry point
 */
async function startServer() {
  try {
    const app = await createApp();
    
    // Get port from environment variable or use default
    const PORT = process.env.PORT || 3001;
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    
    function gracefulShutdown() {
      console.log('Received shutdown signal, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
