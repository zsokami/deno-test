import type { Handler } from '@/types.ts'
import { accepts, acceptsEncodings, acceptsLanguages } from '@std/http/negotiation'

export const handler: Handler = (req) => {
  return Response.json({
    accepts: accepts(req),
    acceptsEncodings: acceptsEncodings(req),
    acceptsLanguages: acceptsLanguages(req),
  })
}
