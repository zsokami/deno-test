export type Handler = (
  req: Request,
  info: Deno.ServeHandlerInfo & { addr: Deno.NetAddr },
) => Response | Promise<Response> | undefined | Promise<undefined>
