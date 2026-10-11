import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app';

// ONE serverless function handles every route (Express does the routing),
// so the project stays far below Vercel's 12-function Hobby limit.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (a: IncomingMessage, b: ServerResponse) => void)(req, res);
}
