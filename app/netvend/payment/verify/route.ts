import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/netvend/lib/firebase';
import { ref, get, set } from 'firebase/database';

// Replace with your actual Paystack secret key
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const tenantId = searchParams.get('tenantId');
    
    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference parameter' },
        { status: 400 }
      );
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId parameter' },
        { status: 400 }
      );
    }
    
    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    // Update payment status in database
    const paymentRef = ref(database, `tenants/${tenantId}/payments/${reference}`);
    const paymentSnapshot = await get(paymentRef);
    
    if (paymentSnapshot.exists()) {
      await set(paymentRef, {
        ...paymentSnapshot.val(),
        status: data.status ? 'success' : 'failed',
        verificationResponse: data,
        verifiedAt: Date.now()
      });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Payment verification error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
