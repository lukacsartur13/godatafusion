/* Netlify Function (v2). Web-standard Request in, Response out — so this
   is only an adapter; every rule lives in server/handler.mjs, which the
   Vite dev/preview middleware runs unchanged. */

import { handleProjectRequest } from '../../server/handler.mjs';

export default async (request, context) =>
  handleProjectRequest(request, {
    env: process.env,
    ip: context?.ip
      || request.headers.get('x-nf-client-connection-ip')
      || null,
  });

export const config = { path: '/api/project-request' };
