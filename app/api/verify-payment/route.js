import crypto from "crypto";

export async function POST(req) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        return new Response(JSON.stringify({ status: "success" }), { status: 200 });
    } else {
        return new Response(JSON.stringify({ status: "failure" }), { status: 400 });
    }
}
