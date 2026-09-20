import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validation/booking";
import { createBooking } from "@/lib/booking/create-booking";
import { getSystemUserId } from "@/lib/system-user";
import { apiErrorResponse, FriendlyError } from "@/lib/api-error";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`public-booking:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!rateLimit.ok) {
      throw new FriendlyError("Too many booking attempts. Please try again in a few minutes.");
    }

    const body = createBookingSchema.parse(await req.json());
    if (!body.newClient) {
      throw new FriendlyError("Client details are required.");
    }

    const systemUserId = await getSystemUserId();
    const booking = await createBooking(body, systemUserId);

    return NextResponse.json(
      { bookingNumber: booking.bookingNumber, status: booking.status, scheduledStart: booking.scheduledStart },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
