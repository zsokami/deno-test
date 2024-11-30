export type Handler = (
  req: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) => Response | undefined | Promise<Response | undefined>
