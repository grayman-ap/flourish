import axios from 'axios'

const key = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_PAYSTACK_LIVE_KEY
  : process.env.NEXT_PUBLIC_PAYSTACK_TEST_KEY

export const api = axios.create({
    baseURL: 'https://api.paystack.co',
    headers:{
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
    }
})