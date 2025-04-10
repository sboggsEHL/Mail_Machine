import 'express-session';

// Define the shape of our session user object
interface SessionUser {
  id: number;
  username: string;
}

// Extend the Express.Session interface to include our custom properties
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

// Export the SessionUser type for use in other files
export { SessionUser };
