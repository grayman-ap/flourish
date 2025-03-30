import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InitializeResponse } from '@/lib/types';

const paystackSecretKey = process.env.NODE_ENV === 'development' ? process.env.PAYSTACK_TEST_KEY : process.env.PAYSTACK_SECRET_KEY;
export async function GET(request: NextRequest) {
  try {
    // Get the reference from the URL
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    // Validate the reference
    if (!reference) {
      return NextResponse.json(
        { error: 'Missing transaction reference' },
        { status: 400 }
      );
    }

    console.log(`Verifying transaction with reference: ${reference}`);
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Payment provider configuration error' },
        { status: 500 }
      );
    }

    // Call Paystack API to verify the transaction
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Parse the response
    const data = await response.json();
    
    console.log('Paystack verification response:', JSON.stringify(data));

    // Check if the verification was successful
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.message || 'Failed to verify payment',
          details: data 
        },
        { status: response.status }
      );
    }

    // Return the verification result
    return NextResponse.json(data);
  } catch (error) {
    // Log the error for debugging
    console.error('Error verifying payment:', error);
    
    // Return a friendly error response
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while verifying the payment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
