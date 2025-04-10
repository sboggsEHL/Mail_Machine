"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
/**
 * Server entry point
 */
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const app = yield (0, app_1.createApp)();
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
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    });
}
// Start the server
startServer();
