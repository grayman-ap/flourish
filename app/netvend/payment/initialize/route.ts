import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/netvend/lib/firebase';
import { ref, set, push } from 'firebase/database';

// Replace with your actual Paystack secret key
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.email) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and email are required' },
        { status: 400 }
      );
    }
    
    // Extract tenant ID from metadata
    const tenantId = body.metadata?.tenantId;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenant ID in metadata' },
        { status: 400 }
      );
    }
    
    // Generate a reference if not provided
    const reference = body.reference || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Initialize payment with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: body.amount * 100, // Convert to kobo (Paystack uses the smallest currency unit)
        email: body.email,
        reference,
        metadata: body.metadata || {},
        callback_url: `${request.nextUrl.origin}/${tenantId}/voucher?reference=${reference}`
      })
    });
    
    const data = await response.json();
    
    if (!data.status) {
      return NextResponse.json(
        { error: data.message || 'Payment initialization failed' },
        { status: 400 }
      );
    }
    
    // Log the payment initialization
    const paymentRef = ref(database, `tenants/${tenantId}/payments/${reference}`);
    await set(paymentRef, {
      amount: body.amount,
      email: body.email,
      metadata: body.metadata || {},
      status: 'pending',
      timestamp: Date.now()
    });
    
    return NextResponse.json(data.data);
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
