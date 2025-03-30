import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InitializeResponse } from '@/lib/types';

const paystackKey = process.env.NODE_ENV === 'development' ? process.env.PAYSTACK_TEST_KEY : process.env.PAYSTACK_SECRET_KEY;
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference');
  
  if (!reference) {
    return NextResponse.json(
      { error: 'Transaction reference is missing' },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get<InitializeResponse>(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.message || error.message },
      { status: 500 }
    );
  }
}
