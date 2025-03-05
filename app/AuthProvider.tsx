"use client"
import React from "react"
import Login from "./auth/login/page"

export function AuthProvider({children}: React.PropsWithChildren){
    const user = localStorage.getItem('nu_ser')
    React.useEffect(() => {
        if(!user){
            window.location.replace("/auth/login")
        }
    }, [])
    return(
        <div>
            {user ? children : <Login />}
        </div>
    )
}