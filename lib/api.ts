import axios from 'axios'
export const api = axios.create({
    headers:{
        Authorization: `Bearer sk_test_7800fc62e546946868b40f678fc2bea4dc4f8122`,
        "Content-Type": "application/json"
    }
})