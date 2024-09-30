export type Handler = (
  req: Request,
  info: Deno.ServeHandlerInfo,
) => Response | Promise<Response> | undefined | Promise<undefined>
