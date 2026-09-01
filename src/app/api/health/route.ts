import { NextResponse } from "next/server";
import { APP_NAME } from "@/config/brand";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: APP_NAME,
    service: "web",
  });
}
