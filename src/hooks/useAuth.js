import { useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { useStore } from "./useStore.js";

export function useAuth() {
    const setAuthUser = useStore(s => s.setAuthUser)
    const clearAuth = useStore(s => s.clearAuth)
    const authUser = useStore(s => s.authUser)
    const authLoading = useStore(s => s.authLoading)

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session} }) => {
            if (session) {
                setAuthUser(session.user)
            }
            else {
                clearAuth()
            }
        })

        const { data: {subscription} } = supabase.auth.onAuthStateChange ((event, session) => {
            if (event === 'SIGNED_IN') {
                setAuthUser(session.user)
            }
            else if (event === 'SIGNED_OUT') {
                clearAuth()
            }
        })
  

        return () => subscription.unsubscribe ()
    }, [])  
    return { authUser, authLoading}
} 

