import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/require-session";
import { can } from "@/lib/auth/permissions";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import {
  transitionTherapistStatus,
  InvalidTherapistTransitionError,
} from "@/lib/therapist-status/state-machine";

interface Params {
  params: Promise<{ id: string }>;
}

// Self-directed statuses only — booking-linked states (RESERVED, TRAVELING,
// ARRIVED, IN_SERVICE, COMPLETED) are set as a side effect of a booking
// status transition (see /api/bookings/[id]/status) so the two never drift
// out of sync with each other.
const SELF_DIRECTED = z.enum(["AVAILABLE", "ON_BREAK", "OFF_DUTY", "OFFLINE", "EMERGENCY"]);
const bodySchema = z.object({ status: SELF_DIRECTED, note: z.string().trim().optional() });

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const isSelf = session.role === "THERAPIST" && session.therapistId === id;
    if (!isSelf && !can(session.role, "therapists:manage")) {
      throw new FriendlyError("Not authorized to change this therapist's status.");
    }
    const body = bodySchema.parse(await req.json());
    await transitionTherapistStatus(id, body.status, { note: body.note });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidTherapistTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
