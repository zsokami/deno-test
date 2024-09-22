import type { Handler } from '@/types.ts'

export const handler: Handler = () => {
  return Response.json(Deno.version)
}
