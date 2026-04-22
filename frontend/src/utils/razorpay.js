import { getSessionId, setPlan } from './session';

export async function openRazorpayCheckout(onSuccess, onFailure) {
  // Step 1: Create order on backend
  const orderRes = await fetch('http://localhost:8000/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: getSessionId()
    })
  });
  const order = await orderRes.json();

  // Step 2: Open Razorpay checkout
  const options = {
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "EquiAI",
    description: "Pro Plan — Unlimited Audits",
    image: "/logo.png",
    theme: { color: "#6d28d9" },

    // Step 3: On payment success
    handler: async function(response) {
      // Verify payment on backend
      const verifyRes = await fetch('http://localhost:8000/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          session_id: getSessionId()
        })
      });
      const result = await verifyRes.json();

      if (result.verified) {
        setPlan('pro');
        onSuccess();
      } else {
        onFailure('Verification failed');
      }
    },

    prefill: {
      name: "",
      email: "",
      contact: ""
    },

    modal: {
      ondismiss: () => {
        console.log('Payment cancelled');
      }
    }
  };

  // Load Razorpay script and open
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => {
    const rzp = new window.Razorpay(options);
    rzp.open();
  };
  document.body.appendChild(script);
}
