// app/api/verify-otp/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing email or OTP" }, { status: 400 });
    }

    // 1. Fetch OTP record
    const recordRef = doc(db, "verifications", email);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      return NextResponse.json({ error: "No verification request found for this email." }, { status: 404 });
    }

    const record = recordSnap.data();

    // 2. Check Expiration
    if (Date.now() > record.expiresAt) {
      await deleteDoc(recordRef); // Clean up
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // 3. Check Match
    if (record.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    // 4. Success! Clean up the record
    await deleteDoc(recordRef);

    return NextResponse.json({ success: true, message: "Email verified successfully." });

  } catch (error: any) {
    return NextResponse.json({ error: "Verification failed", details: error.message }, { status: 500 });
  }
}