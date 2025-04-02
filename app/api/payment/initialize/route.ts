import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { InitializeResponse } from '@/lib/types';

const flutterwaveSecretKey = process.env.NODE_ENV === 'development' 
  ? process.env.FLUTTERWAVE_TEST_KEY 
  : process.env.FLUTTERWAVE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, email, callback_url, metadata } = body;
    
    // Generate a unique transaction reference
    const tx_ref = `FLW-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref,
        amount,
        currency: "NGN",
        redirect_url: callback_url,
        customer: {
          email
        },
        meta: metadata,
        customizations: {
          title: "Flourish Network Subscription",

          logo: "https://www.flourishnet.online/icons/icon-192x192.png"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("Flutterwave response:", JSON.stringify(response.data));

    // Check if the response has the expected structure
    if (!response.data || !response.data.data || !response.data.data.link) {
      throw new Error("Invalid response from payment provider");
    }

    // Transform the response to match the expected format
    const transformedResponse = {
      status: response.data.status === "success",
      message: response.data.message,
      data: {
        authorization_url: response.data.data.link,


        reference: tx_ref, // Use tx_ref as the reference
        access_code: response.data.data.id ? response.data.data.id.toString() : tx_ref
      }
    };

    return NextResponse.json(transformedResponse);
  } catch (error: any) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || error.message },
      { status: 500 }
    );
  }
}