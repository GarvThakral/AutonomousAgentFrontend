"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Upload, Play, Pause, Shuffle, Loader2, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const API_URL = process.env.NEXT_PUBLIC_API_URL

type SheetRow = {
  number: string
  projectName: string
  projectDescription: string
  targetAudience: string
  contentTone: string
  postsMade: string
  page: string
}

type InstagramPage = { id: string; name: string; access_token: string; instagram_business_account?: { id: string } }

export default function AutomatedPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [rows, setRows] = useState<SheetRow[]>([])
  const [parsedPreview, setParsedPreview] = useState<string>("")
  const [accessToken, setAccessToken] = useState("")
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false)
  const [isInstagramConnected, setIsInstagramConnected] = useState(false)
  const [instagramUserToken, setInstagramUserToken] = useState("")
  const [instagramPages, setInstagramPages] = useState<InstagramPage[]>([])
  const [lastChannel, setLastChannel] = useState<"linkedin" | "instagram">("instagram")
  const [isRunning, setIsRunning] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [intervalMinutes, setIntervalMinutes] = useState<number>(7)
  const [nextPostEta, setNextPostEta] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [isRoutingOpen, setIsRoutingOpen] = useState(false)
  const [lockedChannel, setLockedChannel] = useState<"auto" | "linkedin" | "instagram">("auto")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const session = localStorage.getItem("user_session")
    if (!session) {
      router.push("/auth/login")
      return
    }
    if (localStorage.getItem("linkedin_connected") === "true") {
      setIsLinkedInConnected(true)
    }
    const token = localStorage.getItem("access_token")
    if (token) setAccessToken(token)
    const igToken = localStorage.getItem("instagram_user_token")
    if (igToken) {
      setInstagramUserToken(igToken)
      fetchInstagramPages(igToken)
    }
  }, [router])

  const fetchInstagramPages = async (userToken: string) => {
    try {
      const { data } = await axios.get("https://graph.facebook.com/v20.0/me/accounts", {
        params: { access_token: userToken, fields: "name,access_token,instagram_business_account" },
      })
      if (data?.data?.length) {
        setInstagramPages(data.data)
        setIsInstagramConnected(true)
      }
    } catch {
      toast({ title: "Instagram pages failed", description: "Check IG token/permissions.", variant: "destructive" })
    }
  }

  const connectLinkedIn = () => {
    const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/callback"
    const CLIENT_ID = "86hk0lsdjculis"
    const scopes = ["profile", "email", "openid", "w_member_social"].join("%20")
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&state=random123`
  }

  const connectInstagram = async () => {
    try {
      const { data } = await axios.get(`${API_URL}oauth/instagram/url`)
      window.location.href = data.url
    } catch {
      toast({ title: "Instagram connect failed", description: "Verify backend env and redirect.", variant: "destructive" })
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/)
    if (!lines.length) return []
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const rowsParsed: SheetRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",")
      if (cols.length < 7) continue
      const map: Record<string, string> = {}
      header.forEach((key, idx) => (map[key] = cols[idx]?.trim() || ""))
      rowsParsed.push({
        number: map["number"] || "",
        projectName: map["project name"] || "",
        projectDescription: map["project description"] || "",
        targetAudience: map["target audience"] || "",
        contentTone: map["content tone"] || "",
        postsMade: map["number of posts made"] || "",
        page: map["page"] || "",
      })
    }
    return rowsParsed
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    const parsed = parseCSV(text)
    setRows(parsed)
    setParsedPreview(parsed.slice(0, 3).map((r) => `${r.projectName} -> ${r.page}`).join("\n"))
    toast({ title: "Sheet loaded", description: `${parsed.length} rows ready.` })
  }

  const isInstagramReady = useMemo(
    () =>
      !!instagramUserToken &&
      instagramPages.some((p) => p.instagram_business_account?.id),
    [instagramUserToken, instagramPages]
  )
  const isLinkedInReady = useMemo(
    () => !!accessToken && isLinkedInConnected,
    [accessToken, isLinkedInConnected]
  )

  const pickNextChannel = () => {
    if (lockedChannel === "linkedin" && isLinkedInReady) return "linkedin"
    if (lockedChannel === "instagram" && isInstagramReady) return "instagram"
    if (isInstagramReady && isLinkedInReady) {
      return lastChannel === "instagram" ? "linkedin" : "instagram"
    }
    if (isInstagramReady) return "instagram"
    if (isLinkedInReady) return "linkedin"
    return "linkedin"
  }

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const scheduleNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    const base = intervalMinutes || 7
    const jitter = Math.random() * 1 // 0-1 minute jitter
    const delay = (base + jitter) * 60 * 1000
    const target = Date.now() + delay
    updateEta(target)
    countdownRef.current = setInterval(() => updateEta(target), 1000)
    timerRef.current = setTimeout(async () => {
      await triggerPost()
      scheduleNext()
    }, delay)
  }

  const startAutomation = () => {
    if (isRunning) {
      toast({ title: "Automation already running", description: "Stop first if you want to restart.", variant: "destructive" })
      return
    }
    if (!rows.length) {
      toast({ title: "Load sheet first", description: "Upload CSV/Google Sheet export.", variant: "destructive" })
      return
    }
    clearTimers()
    setIsRunning(true)
    triggerPost(true)
    scheduleNext()
    toast({ title: "Automation started", description: "Posting every N minutes alternately." })
  }

  const stopAutomation = () => {
    setIsRunning(false)
    clearTimers()
    toast({ title: "Automation stopped" })
  }

  const appendLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 50))
    try {
      localStorage.setItem("automation_logs", JSON.stringify([`[${timestamp}] ${message}`, ...logs].slice(0, 50)))
    } catch (_) {
      // ignore storage errors
    }
  }

  const triggerPost = async (isImmediate = false) => {
    if (!rows.length) return
    const row = rows[Math.floor(Math.random() * rows.length)]
    const channel = pickNextChannel()
    if (channel === "instagram" && !isInstagramReady) {
      appendLog(`Skipped Instagram (not ready) for ${row.projectName}`)
      setIsPosting(false)
      return
    }
    if (channel === "linkedin" && !isLinkedInReady) {
      appendLog(`Skipped LinkedIn (not ready) for ${row.projectName}`)
      setIsPosting(false)
      return
    }
    setIsPosting(true)
    try {
      const contentResp = await axios.post(`${API_URL}makepost`, {
        contentRequirements: row.projectDescription || row.projectName,
        targetAudience: row.targetAudience,
        postTone: row.contentTone || "Professional",
        context: `Project: ${row.projectName}. Page: ${row.page}.`,
      })

      const slide = [...contentResp.data.content_data.image_instructions]
      const content = [...contentResp.data.image_urls]
      const slides = content.map((c: any, i: number) => ({ title: slide[i], content: c }))
      const hashString = contentResp.data.content_data.hashtag_suggestions.join(" ")
      const finalText = `${contentResp.data.content_data.content_draft} ${hashString}`

      if (channel === "linkedin") {
        if (!accessToken) throw new Error("Missing LinkedIn access token")
        await axios.post(`${API_URL}postcontent`, {
          content_data: {
            ...contentResp.data.content_data,
            text: finalText,
            slides,
          },
          image_urls: slides.map((s) => s.content),
          post_type: "carousel",
          access_token: accessToken,
        })
      } else {
        if (!instagramUserToken) throw new Error("Missing Instagram user token")
        const pageMatch =
          instagramPages.find((p) => p.name.toLowerCase() === row.page.toLowerCase()) ||
          instagramPages.find((p) => p.instagram_business_account?.id)
        if (!pageMatch) throw new Error(`No IG page matching "${row.page}" and no fallback pages with IG account`)
        const igBiz = pageMatch.instagram_business_account?.id
        if (!igBiz) throw new Error("Selected page has no linked Instagram Business Account")
        await axios.post(`${API_URL}instagram/publish`, {
          page_token: pageMatch.access_token,
          ig_user_id: igBiz,
          image_url: slides[0]?.content,
          caption: finalText,
        })
      }
      toast({ title: `Posted to ${channel}`, description: `${row.projectName}` })
      appendLog(`Posted ${row.projectName} to ${channel}`)
      setLastChannel(channel)
    } catch (err: any) {
      toast({
        title: "Automation post failed",
        description: err?.message || "Check tokens/pages and sheet data.",
        variant: "destructive",
      })
      appendLog(`Failed posting ${row.projectName}: ${err?.message || "unknown"}`)
    } finally {
      setIsPosting(false)
    }
  }

  const updateEta = (target: number) => {
    const remaining = target - Date.now()
    if (remaining <= 0) {
      setNextPostEta("Posting now...")
      return
    }
    const mins = Math.floor(remaining / 60000)
    const secs = Math.floor((remaining % 60000) / 1000)
    setNextPostEta(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`)
  }

  const statusBadge = (label: string, ok: boolean) => (
    <div className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
      {ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {ok ? `${label} Connected` : `${label} Not Connected`}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Automated Posting</h1>
            <p className="text-slate-600">Upload a sheet and auto-post every 7-8 minutes, alternating channels.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={connectLinkedIn} className="bg-blue-600 text-white hover:bg-blue-700">
              {isLinkedInConnected ? "LinkedIn Connected" : "Connect LinkedIn"}
            </Button>
            <Button variant="outline" onClick={connectInstagram} className="bg-blue-600 text-white hover:bg-blue-700">
              {isInstagramConnected ? "Instagram Connected" : "Connect Instagram"}
            </Button>
            <Dialog open={isRoutingOpen} onOpenChange={setIsRoutingOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-100">
                  View routing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Posting plan</DialogTitle>
                  <DialogDescription>See upcoming channel and recent destinations.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm text-slate-800">
                  <div className="space-y-1">
                    <span className="font-medium">Channel lock</span>
                    <div className="flex gap-2">
                      {["auto", "linkedin", "instagram"].map((opt) => (
                        <Button
                          key={opt}
                          size="sm"
                          variant={lockedChannel === opt ? "default" : "outline"}
                          onClick={() => setLockedChannel(opt as "auto" | "linkedin" | "instagram")}
                        >
                          {opt === "auto" ? "Auto alternate" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Next channel</span>
                    <span className="px-2 py-1 rounded bg-slate-100">{pickNextChannel()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Next post in</span>
                    <span className="px-2 py-1 rounded bg-slate-100">{nextPostEta || "—"}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Recent activity</p>
                    <div className="max-h-40 overflow-y-auto border rounded p-2 bg-slate-50">
                      {logs.length === 0 ? (
                        <p className="text-slate-600">No posts yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {logs.map((log, idx) => (
                            <li key={idx} className="border-b last:border-b-0 pb-1 text-slate-700">
                              {log}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Sheet Upload</CardTitle>
              <CardDescription>Upload a CSV export from Google Sheets with columns: number, project name, project description, target audience, content tone, number of posts made, page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label className="block text-sm font-medium text-slate-700">CSV File</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-white">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-2">Export from Google Sheets as CSV and upload.</p>
              </div>
              {parsedPreview && (
                <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-700 whitespace-pre-line">
                  Preview (first rows):
                  <br />
                  {parsedPreview}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-sm font-medium text-slate-700">Interval (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value) || 1)}
                  />
                  <p className="text-xs text-slate-500">Posts every N minutes + up to 1 minute jitter.</p>
                </div>
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">Next post in:</p>
                  <p className="text-lg font-bold text-slate-900">{nextPostEta || "—"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={triggerPost} disabled={!rows.length || isPosting} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800">
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
                  Post one now
                </Button>
                {isRunning ? (
                  <Button variant="outline" onClick={stopAutomation} className="border-red-600 text-red-700 hover:bg-red-50">
                    <Pause className="h-4 w-4 mr-2" />
                    Stop automation
                  </Button>
                ) : (
                  <Button variant="outline" onClick={startAutomation} className="border-green-600 text-green-700 hover:bg-green-50">
                    <Play className="h-4 w-4 mr-2" />
                    Start automation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Connections and targeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusBadge("LinkedIn", isLinkedInConnected)}
              {statusBadge("Instagram", isInstagramConnected)}
              <div className="rounded-md bg-white border p-3">
                <p className="text-sm font-medium text-slate-800 mb-2">Instagram Pages</p>
                {instagramPages.length === 0 ? (
                  <p className="text-sm text-slate-600">Load pages after Instagram connect.</p>
                ) : (
                  <div className="space-y-2">
                    {instagramPages.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2">
                        <span className="text-sm">{p.name}</span>
                        {p.instagram_business_account?.id ? (
                          <span className="text-xs text-green-700">IG linked</span>
                        ) : (
                          <span className="text-xs text-red-600">No IG account</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-md bg-white border p-3">
                <p className="text-sm font-medium text-slate-800 mb-2">Automation</p>
                <p className="text-sm text-slate-600">
                  Mode: alternating LinkedIn/Instagram every 7-8 minutes. Page targeting uses the "page" column to find the matching IG page by name.
                </p>
              </div>
              <div className="rounded-md bg-white border p-3 max-h-56 overflow-y-auto">
                <p className="text-sm font-medium text-slate-800 mb-2">Recent activity</p>
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-600">No posts yet.</p>
                ) : (
                  <ul className="text-sm text-slate-700 space-y-1">
                    {logs.map((log, idx) => (
                      <li key={idx} className="border-b last:border-b-0 pb-1">
                        {log}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
