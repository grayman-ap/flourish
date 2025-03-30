import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InitializeResponse } from '@/lib/types';

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
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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
