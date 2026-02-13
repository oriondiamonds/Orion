import { NextResponse } from "next/server";
import { validateCoupon } from "../../../../utils/couponValidator.js";

export async function POST(request) {
  try {
    const { code, cartItems, customerEmail } = await request.json();

    if (!code || !cartItems || !customerEmail) {
      return NextResponse.json(
        { valid: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code, cartItems, customerEmail);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
