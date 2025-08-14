"use client"
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import axios from 'axios';
import { useRouter } from "next/navigation";
import { Suspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL
export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Callback />
    </Suspense>
  );
}

function Callback(){
 const searchParams = useSearchParams()
 const router = useRouter()
 useEffect(() => {
   const code = searchParams.get('code')
   const error = searchParams.get('error')
   const state = searchParams.get('state')
   
   if (error) {
     console.log('OAuth error:', error)
     return
   }
   
   if (code) {
     console.log('Authorization code:', code)
     handleTokenExchange(code)
   }
   
 }, [searchParams])

 const handleTokenExchange = async (code:any) => {
   try {
    console.log(`https://linkedinautomationagent-1.onrender.com/connectLinkedin`)
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}connectLinkedin`, {
       code: code
     }, {
       headers: { 
         'Content-Type': 'application/json' 
       }
     })
     console.log(response.data)
     if (!response.data.error) {
        console.log(response.data['access_token'])
        console.log(response.data.access_token)
        localStorage.setItem("access_token",response.data['access_token'])
        localStorage.setItem("linkedin_connected","true")
        router.push('/')

    }else{
        alert("Some error authorizing")
        localStorage.removeItem("access_token")
        localStorage.setItem("linkedin_connected","false")
        router.push('/')
    }
   } catch (error) {
        alert('Token exchange failed:' + error)
        localStorage.removeItem("access_token")
        localStorage.setItem("linkedin_connected","false")

   }
 }

 return (
   <div>
     <h1>Connecting LinkedIn...</h1>
     <p>Please wait while we complete the connection.</p>
   </div>
 )
}