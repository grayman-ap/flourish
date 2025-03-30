/**
 * Verifies a payment reference with Paystack
 */
export async function verifyPaymentReference(reference: string) {
  try {
    const paystackUrl = process.env.PAYSTACK_URL || process.env.NEXT_PUBLIC_PAYSTACK_URL;
    
    // Use test key in development, live key in production
    const secretKey = process.env.NODE_ENV === 'production' 
      ? process.env.PAYSTACK_LIVE_KEY 
      : process.env.PAYSTACK_TEST_KEY;

    if (!paystackUrl || !secretKey) {
      return { success: false, message: 'Payment configuration is missing' };
    }

    const response = await fetch(`${paystackUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, message: 'Payment verification failed' };
    }

    const data = await response.json();
    
    if (data.status && data.data.status === 'success') {
      return { success: true, data: data.data };
    } else {
      return { success: false, message: data.message || 'Payment not successful' };
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return { success: false, message: 'An error occurred during payment verification' };
  }
}
