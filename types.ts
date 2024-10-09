export type Handler = (
  req: Request,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) => Response | Promise<Response> | undefined | Promise<undefined>
