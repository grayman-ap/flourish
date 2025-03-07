/* eslint-disable @typescript-eslint/no-unused-vars */
import {create} from 'zustand'
import z from 'zod'

interface Plans {
    plans: [
        {id: 
            {capacity: string, data_bundle: number, duration: number, price: number}
        }
    ]
}

const Auth = z.object({
    email: z.string(),
    password: z.string()
})
const Network = z.object({
    network_provider: z.string(),
    network_location: z.string(),
    phone_number: z.string(),
    category: z.string(),
    plan: z.object({
        price: z.number(),
        duration: z.number(),
        data_bundle: z.number(),
        capacity: z.string(),
    })
})

const Voucher = z.object({
    duration: z.string(),
    capacity: z.string(),
    data_bundle: z.number(),
    vouchers: z.string(),
    location: z.string()
})

export type NetworkRequest = z.infer<typeof Network>
export type VoucherRequest = z.infer<typeof Voucher>
export type AuthRequest = z.infer<typeof Auth>

type State = {
    payload: NetworkRequest,
    voucherPayload: VoucherRequest
    auth: AuthRequest
    voucher: string
}
type Action = {
    setVoucher: (voucher: string | undefined) => void;
    setVoucherPayload: <K extends keyof VoucherRequest>(field: K, value: VoucherRequest[K]) => void
    setNetworkPayload: <K extends keyof NetworkRequest>(field: K, value: NetworkRequest[K]) => void
    setAuthPayload: <K extends keyof AuthRequest>(field: K, value: AuthRequest[K]) => void
}
const useNetworkApi = create<State & Action>(
    ((set, get) => ({
        payload: {
            network_location: 'alheri-network',
            phone_number: '',
            network_provider: 'florish network',
            plan: {
                price: 0,
                data_bundle: 0,
                duration: 0,
                capacity: 'MB'
            },
            category: ''
        } satisfies NetworkRequest,
        voucher: '',
        voucherPayload: {
            duration: '',
            capacity: '',
            vouchers: '',
            data_bundle: 0,
            location: ''
        } satisfies VoucherRequest,
        auth: {
            email: '',
            password: ''
        } satisfies AuthRequest,
        setVoucher: (voucher: string | undefined) => set({voucher}),
        setNetworkPayload: <K extends keyof NetworkRequest>(field: K, value: NetworkRequest[K]) => {
            const {payload} = get()
            set({
                payload: {
                    ...payload,
                    [field]: value
                }
            })
        },
        setVoucherPayload: <K extends keyof VoucherRequest>(field: K, value: VoucherRequest[K]) => {
            const {voucherPayload} = get()
            set({
                voucherPayload: {
                    ...voucherPayload,
                    [field]: value
                }
            })
        },
        setAuthPayload: <K extends keyof AuthRequest>(field: K, value: AuthRequest[K]) => {
            const {auth} = get()
            set({
                auth: {
                    ...auth,
                    [field]: value
                }
            })
        }
    }))
)

export {
    useNetworkApi
}