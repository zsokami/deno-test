export type Handler = (
  req: Request,
  info: {
    remoteAddr: Deno.NetAddr
    addr: Deno.NetAddr
  },
) => Response | Promise<Response> | undefined | Promise<undefined>
