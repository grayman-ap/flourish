import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const flutterwaveSecretKey = process.env.NODE_ENV === 'development' 
  ? process.env.FLUTTERWAVE_TEST_KEY 
  : process.env.FLUTTERWAVE_SECRET_KEY;

export async function GET(request: NextRequest) {
  try {
    // Get the transaction ID from the URL
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');
    const tx_ref = searchParams.get('tx_ref');

    // We can verify using either transaction_id or tx_ref
    let verificationEndpoint;
    let queryParam;

    if (transaction_id) {
      verificationEndpoint = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
      queryParam = transaction_id;
    } else if (tx_ref) {
      verificationEndpoint = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`;
      queryParam = tx_ref;
    } else {
      return NextResponse.json(
        { error: 'Missing transaction ID or reference' },
        { status: 400 }
      );
    }

    console.log(`Verifying transaction with ${transaction_id ? 'ID' : 'reference'}: ${queryParam}`);
    
    if (!flutterwaveSecretKey) {
      console.error('FLUTTERWAVE_SECRET_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Payment provider configuration error' },
        { status: 500 }
      );
    }

    // Call Flutterwave API to verify the transaction
    const response = await axios.get(
      verificationEndpoint,
      {
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Flutterwave verification response:', JSON.stringify(response.data));

    // Transform the response to match the expected Paystack format
    const transformedResponse = {
      status: response.data.status === "success",
      message: response.data.message,
      data: {
        id: response.data.data.id,
        reference: response.data.data.tx_ref,
        status: response.data.data.status === "successful" ? "success" : "failed",
        amount: response.data.data.amount,
        metadata: response.data.data.meta,
        customer: {
          email: response.data.data.customer.email
        }
      }
    };

    return NextResponse.json(transformedResponse);
  } catch (error: any) {
    // Log the error for debugging
    console.error('Error verifying payment:', error.response?.data || error.message);
    
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
