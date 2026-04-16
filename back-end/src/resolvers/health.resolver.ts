import type { AppContext, AppServices } from "../app/types";

export async function resolveHealth(
  c: AppContext,
  services: AppServices,
): Promise<Response> {
  const traceId = c.get("traceId");
  const renderer = await services.gotenberg.getHealth(traceId);
  const status = renderer.ok ? 200 : 503;

  return c.json(
    {
      status: renderer.ok ? "ok" : "degraded",
      service: "back-end",
      renderer: {
        ok: renderer.ok,
        status: renderer.status,
        details: renderer.details,
      },
      traceId,
    },
    status as 200 | 503,
  );
}
