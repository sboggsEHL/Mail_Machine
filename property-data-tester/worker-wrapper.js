// This is a CommonJS wrapper for the worker.ts file
// It allows us to use ES modules in the worker.ts file while still
// being compatible with the rest of the project

// Use ts-node to register TypeScript
require('ts-node').register({
  project: './property-data-tester/tsconfig.server.json',
  transpileOnly: true
});

// Load the worker
require('./server/worker');
