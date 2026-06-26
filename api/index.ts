import { createApiApp } from "../server/app";

// Vercel serverless entry. The Express app declares full "/api/*" paths and
// Vercel forwards the original request path to it, so routing lines up.
export default createApiApp();
