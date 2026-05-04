"use client"
import React, { useEffect, useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Coins, PlusCircle } from 'lucide-react';

function CreditsDisplay() {
    const { user } = useUser();
    const userData = useQuery(api.users.GetUser, { uid: user?.id || "" });
    const addCredits = useMutation(api.users.AddCredits);
    const [isProcessing, setIsProcessing] = useState(false);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.id = "razorpay-checkout-js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBuyCredits = async (amount) => {
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            alert("Razorpay Public Key is missing. Please add it to .env.local to enable payments.");
            return;
        }

        const res = await loadRazorpay();
        if (!res) {
            alert("Razorpay SDK failed to load. Are you online?");
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Create Order
            const orderRes = await fetch("/api/create-razorpay-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount * 10 }), // 1 credit = 10 rupees
            });
            const orderData = await orderRes.json();

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Bhavable Credits",
                description: `Buy ${amount} Credits`,
                order_id: orderData.id,
                handler: async function (response) {
                    // 3. Verify Payment
                    const verifyRes = await fetch("/api/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(response),
                    });
                    const verifyData = await verifyRes.json();

                    if (verifyData.status === "success") {
                        await addCredits({ uid: user.id, amount: amount });
                        alert("Payment successful! Credits added.");
                    } else {
                        alert("Payment verification failed.");
                    }
                },
                prefill: {
                    name: user?.fullName,
                    email: user?.primaryEmailAddress?.emailAddress,
                },
                theme: { color: "#ef4444" },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error("Payment error:", error);
            alert("Something went wrong with the payment.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!user) return null;

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white/90 tabular-nums">
                    {userData?.credits ?? 0} <span className="text-white/60 font-normal ml-0.5">credits</span>
                </span>
            </div>
            <button 
                onClick={() => handleBuyCredits(10)}
                disabled={isProcessing}
                className="text-white/60 hover:text-white transition-colors"
            >
                <PlusCircle className="w-4 h-4" />
            </button>
        </div>
    );
}



export default CreditsDisplay;
