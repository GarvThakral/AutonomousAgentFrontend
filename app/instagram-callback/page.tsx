"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL

function InstagramCallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      toast({
        title: "Instagram auth failed",
        description: String(error),
        variant: "destructive",
      })
      router.push("/")
      return
    }

    if (!code) return

    const exchange = async () => {
      try {
        const { data } = await axios.post(`${API_URL}oauth/instagram/token`, { code })
        if (data.access_token) {
          localStorage.setItem("instagram_user_token", data.access_token)
          toast({
            title: "Instagram connected",
            description: "User access token saved.",
          })
        }
      } catch (err: any) {
        const message = err?.response?.data?.detail || "Token exchange failed"
        toast({
          title: "Instagram auth error",
          description: message,
          variant: "destructive",
        })
      } finally {
        router.push("/")
      }
    }

    exchange()
  }, [searchParams, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">Connecting Instagram...</p>
        <p className="text-sm text-gray-600">Finalizing the OAuth flow.</p>
      </div>
    </div>
  )
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InstagramCallbackInner />
    </Suspense>
  )
}
