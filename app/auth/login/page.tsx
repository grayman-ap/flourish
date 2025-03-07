/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useNetworkApi } from "@/app/network.store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import React from "react";

export default function Login(){
    const {auth: payload, setAuthPayload} = useNetworkApi()
    const loginUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try{
             await signInWithEmailAndPassword(auth, payload.email, payload.password)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }catch (error:any) {
           alert(`Login error: invalid credentials`);
          }
    } 

    onAuthStateChanged(auth, (user) => {
        if (user){
            window.location.replace("/management")
            if (typeof window !== "undefined") {
                localStorage.setItem('nu_ser', `${user.email}`)
              }
        }else {
            console.log("No user logged in.");
          }  
    })
    return(
        <div className="flex justify-center items-center mx-auto h-[100vh]">
        <Card className="w-fit border-none shadow-none outline-none">
            <CardHeader className="text-center">
                <CardTitle className="font-[family-name:var(--font-mecan-bold)] text-xl">Flourish Network Management</CardTitle>
                <CardDescription>Provide your login info to manage flourish networks</CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-5 drop-shadow-md border p-4 rounded-md">
                    <Input value={payload.email} onChange={(e) => setAuthPayload('email', e.target.value)} className="py-6" placeholder="Email address"/>
                    <Input value={payload.password} onChange={(e) => setAuthPayload('password', e.target.value)} className="py-6" placeholder="Password"/>
                    <div className="flex justify-center items-center my-5">
                        <button 
                        onClick={(e) => loginUser(e)}
                        className="w-[15rem] py-2 rounded-sm bg-blue-500 text-white text-center active:scale-[1.05] transition-all ease-linear duration-150 cursor-pointer">
                            Log in
                        </button>
                    </div>
                    <p className="text-sm">Note: Not an admin? <Link href={"/"} className="text-blue-500 underline">Main page</Link></p>
            </CardContent>
        </Card>
        </div>
    )
}