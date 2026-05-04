import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
    const { amount, currency } = await req.json();

    try {
        const options = {
            amount: amount * 100, // Amount in paise
            currency: currency || "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7),
        };

        const order = await razorpay.orders.create(options);
        return new Response(JSON.stringify(order), { status: 200 });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500 });
    }
}
