/* eslint-disable @typescript-eslint/no-unused-vars */
import {create} from 'zustand'
import z from 'zod'

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
    vouchers: z.string()
})

export type NetworkRequest = z.infer<typeof Network>
export type VoucherRequest = z.infer<typeof Voucher>

type State = {
    payload: NetworkRequest,
    voucherPayload: VoucherRequest
    voucher: string
}
type Action = {
    setVoucher: (voucher: string | undefined) => void;
    setVoucherPayload: <K extends keyof VoucherRequest>(field: K, value: VoucherRequest[K]) => void
    setNetworkPayload: <K extends keyof NetworkRequest>(field: K, value: NetworkRequest[K]) => void
}
const useNetworkApi = create<State & Action>(
    ((set, get) => ({
        payload: {
            network_location: 'Select location',
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
            data_bundle: 0
        } satisfies VoucherRequest,
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
        }
    }))
)

export {
    useNetworkApi
}