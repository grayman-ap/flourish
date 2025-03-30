import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InitializeResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, email, callback_url } = body;
    
    const response = await axios.post<InitializeResponse>(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount,
        callback_url,
      },
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
