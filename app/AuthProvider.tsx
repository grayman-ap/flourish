import { useState, useEffect } from "react";
import Login from "./auth/login/page";

export function AuthProvider({ children }: React.PropsWithChildren) {
    const [user, setUser] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("nu_ser");
            setUser(storedUser);

            if (!storedUser) {
                window.location.replace("/auth/login");
            }
        }
    }, []);

    if (user === null) {
        return <div>Loading...</div>; // Prevent rendering during SSR
    }

    return <div>{user ? children : <Login />}</div>;
}