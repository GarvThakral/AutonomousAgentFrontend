"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  User,
  CheckCircle,
  AlertCircle,
  Pen
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function LinkedInAIAgent() {
  const [user, setUser] = useState<any>(null)
  const [contentRequirements, setContentRequirements] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [postTone, setPostTone] = useState("")
  const [contextText, setContextText] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [instagramPageToken, setInstagramPageToken] = useState("")
  const [instagramUserId, setInstagramUserId] = useState("")
  const [instagramCaptionOverride, setInstagramCaptionOverride] = useState("")
  const [instagramPages, setInstagramPages] = useState<any[]>([])
  const [selectedInstagramPage, setSelectedInstagramPage] = useState<any>(null)
  const [instagramUserToken, setInstagramUserToken] = useState("")
  const [redditSubreddit, setRedditSubreddit] = useState("")
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false)
  const [isInstagramConnected, setIsInstagramConnected] = useState(false)
  const [isRedditConnected, setIsRedditConnected] = useState(false)
  const [isInstagramConnecting, setIsInstagramConnecting] = useState(false)
  const [isRedditConnecting, setIsRedditConnecting] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<any>(null)
  const [editedText, setEditedText] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  function fetchInstagramPages(userToken: string) {
    if (!userToken) return
    axios
      .get("https://graph.facebook.com/v20.0/me/accounts", {
        params: { access_token: userToken, fields: "name,access_token,instagram_business_account" },
      })
      .then(({ data }) => {
        if (data?.data?.length) {
          setInstagramPages(data.data)
          setIsInstagramConnected(true)
          toast({
            title: "Pages loaded",
            description: "Select a page to post.",
          })
        }
      })
      .catch(() => {
        toast({
          title: "Failed to fetch Instagram pages",
          description: "Verify user access token and permissions.",
          variant: "destructive",
        })
      })
  }

  useEffect(() => {
    const userSession = localStorage.getItem("user_session")
    if (!userSession) {
      router.push("/auth/login")
      return
    }

    try {
      // older flow stores just the user_id; newer could store JSON
      const parsed = JSON.parse(userSession)
      const safeUser = typeof parsed === "object" ? parsed : { id: parsed, name: `User ${parsed}` }
      setUser(safeUser)
    } catch {
      const safeUser = { id: userSession, name: `User ${userSession}` }
      setUser(safeUser)
    }

    const linkedInConnection = localStorage.getItem("linkedin_connected")
    if (linkedInConnection === "true") {
      setIsLinkedInConnected(true)
    }

    const existingToken = localStorage.getItem("access_token")
    if (existingToken) {
      setAccessToken(existingToken)
    }

    const igUserToken = localStorage.getItem("instagram_user_token")
    if (igUserToken) {
      setInstagramUserToken(igUserToken)
      fetchInstagramPages(igUserToken)
      setIsInstagramConnected(true)
    }

    const redditFlag = localStorage.getItem("reddit_connected")
    if (redditFlag === "true") {
      setIsRedditConnected(true)
    }
  }, [router])

  // Attempt to refetch pages when token changes (e.g., after callback)
  useEffect(() => {
    if (instagramUserToken && instagramPages.length === 0) {
      fetchInstagramPages(instagramUserToken)
    }
  }, [instagramUserToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    localStorage.removeItem("user_session")
    localStorage.removeItem("access_token")
    localStorage.removeItem("linkedin_connected")
    router.push("/auth/login")
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const connectLinkedIn = async () => {
    setIsConnectingLinkedIn(true)

    const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/callback"
    const CLIENT_ID = "86hk0lsdjculis"

    const scopes = [
      "profile", // Basic profile info (name, photo, etc.)
      "email", // Email address
      "openid", // OpenID Connect (for user identification)
      "w_member_social", // Post content
    ].join("%20")
    // Immediately redirect - no setTimeout needed
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&state=random123`
  }

  const connectInstagram = async () => {
    try {
      setIsInstagramConnecting(true)
      const { data } = await axios.get(`${API_URL}oauth/instagram/url`)
      window.location.href = data.url
    } catch (error) {
      toast({
        title: "Instagram connect failed",
        description: "Check your API configuration and redirect URI.",
        variant: "destructive",
      })
    } finally {
      setIsInstagramConnecting(false)
    }
  }

  const selectInstagramPage = (page: any) => {
    setSelectedInstagramPage(page)
    setInstagramPageToken(page.access_token)
    const igBiz = page.instagram_business_account?.id
    if (igBiz) {
      setInstagramUserId(igBiz)
      toast({ title: "Page selected", description: `${page.name} linked to IG ${igBiz}` })
    } else {
      setInstagramUserId("")
      toast({
        title: "No Instagram account linked",
        description: "Link this Page to an Instagram Business Account first.",
        variant: "destructive",
      })
    }
  }

  const generateContent = async () => {
    if (!contentRequirements) {
      toast({
        title: "Add content requirements",
        description: "Describe the content you want to generate to proceed.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    setTimeout(async () => {
      try {
        const response = await axios.post(`${API_URL}makepost`, {
          contentRequirements,
          targetAudience,
          postTone,
          context: contextText,
        })
        console.log(response.data)
        let slide = []
        slide = [...response.data.content_data.image_instructions]
        let content = []
        content = [...response.data.image_urls]
        const slides = []
        for (let i = 0; i < content.length; i++) {
          const obj = {
            title: slide[i],
            content: content[i],
          }
          slides.push(obj)
        }
        const hashString = response.data.content_data.hashtag_suggestions.join(" ")
        console.log(hashString)
        const mockPost = {
          // type: Math.random() > 0.5 ? "carousel" : "article",
          type: "carousel",
          content: {
            name:`${response.data.name}`,
            industry:`${response.data.industry}`,
            title: "🚀 The Future of AI in Personal Branding",
            text: `${response.data.content_data.content_draft} ${hashString}`,
            slides: slides,
            hashtags: response.data.hashtag_suggestions,
            engagement: {
              likes: Math.floor(Math.random() * 500) + 50,
              comments: Math.floor(Math.random() * 50) + 5,
              shares: Math.floor(Math.random() * 25) + 2,
            },
          },
        }
        setGeneratedPost(mockPost)
        setEditedText(mockPost.content.text)
        setIsGenerating(false)
        toast({
          title: "Content generated successfully",
          description: "Your LinkedIn post has been created!",
        variant: "destructive",

        })
      } catch (error) {
        alert("Error generating content")
        setIsGenerating(false)
      }
    }, 3000)
  }

  const postToLinkedIn = async () => {
    if (!accessToken) {
      toast({
        title: "No access token",
        description: "Please generate a LinkedIn access token first. From the button above",
        variant: "destructive",
      })
      return
    }

    if (!generatedPost) {
      toast({
        title: "No content generated",
        description: "Please generate content before posting.",
        variant: "destructive",
      })
      return
    }

    try {
      const finalText = editedText || generatedPost.content.text
      const payload = {
        content_data: generatedPost.content,
        image_urls: generatedPost.content.slides ? generatedPost.content.slides.map((slide: any) => slide.content) : [],
        post_type: "carousel",
        access_token: accessToken,
      }
      payload.content_data.text = finalText

      const response = await axios.post(`${API_URL}postcontent`, payload)
      if (response.data.status === "success") {
        toast({
          title: "Posted to LinkedIn!",
          description: "Your content has been successfully published.",
        variant: "destructive",

        })
      } else {
        toast({
          title: "Posting failed",
          description: "There was an error posting your content.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post to LinkedIn.",
        variant: "destructive",
      })
      console.error(error)
    }
  }

  const nextSlide = () => {
    if (generatedPost?.content.slides) {
      setCurrentSlide((prev) => (prev + 1) % generatedPost.content.slides.length)
    }
  }

  const prevSlide = () => {
    if (generatedPost?.content.slides) {
      setCurrentSlide((prev) => (prev - 1 + generatedPost.content.slides.length) % generatedPost.content.slides.length)
    }
  }

const regenerateImages = async () => {
  try {
    const response = await axios.post(`${API_URL}regenerateImages`, {
      contentRequirements,
      targetAudience,
      postTone,
      access_token: accessToken
    });

    const urls = response.data.urls || [];
    const instr = response.data.image_instructions || [];

    // map to the same shape you used originally: { title, content }
    const newSlides = urls.map((url, i) => ({
      title: instr[i] ?? `Slide ${i+1}`,
      content: url
    }));

    setGeneratedPost(prev => {
      if (!prev || !prev.content) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          slides: newSlides
        }
      };
    });

    console.log("Updated slides:", newSlides);
  } catch (err) {
    console.error("Regenerate failed:", err);
  }
};

  const postToInstagram = async () => {
    if (!instagramPageToken || !instagramUserId) {
      toast({
        title: "Instagram details needed",
        description: instagramUserToken
          ? "Load pages and select one to auto-fill token and IG user ID."
          : "Connect Instagram, then load pages.",
        variant: "destructive",
      })
      return
    }
    if (!generatedPost?.content?.slides?.length) {
      toast({
        title: "Generate content first",
        description: "Create a post to publish.",
        variant: "destructive",
      })
      return
    }

    const imageUrl = generatedPost.content.slides[0].content
    const caption = instagramCaptionOverride || editedText || generatedPost.content.text

    try {
      await axios.post(`${API_URL}instagram/publish`, {
        page_token: instagramPageToken,
        ig_user_id: instagramUserId,
        image_url: imageUrl,
        caption,
      })
      toast({
        title: "Posted to Instagram",
        description: "Your image has been published.",
      })
    } catch (error) {
      toast({
        title: "Instagram publish failed",
        description: "Verify tokens, IG user ID, and permissions.",
        variant: "destructive",
      })
    }
  }

  const postToReddit = async () => {
    toast({
      title: "Reddit disabled",
      description: "Reddit posting is turned off for now.",
      variant: "destructive",
    })
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Posting agent</h1>
            <p className="text-xl text-gray-600">AI-Powered  Content Generator</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {user.name || user.email || `User ${user.id ?? ""}`}
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Configuration
              </CardTitle>
              <CardDescription>Craft, refine, and publish across LinkedIn, Instagram, and Reddit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {isLinkedInConnected ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {isLinkedInConnected ? "LinkedIn Connected" : "LinkedIn Not Connected"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isLinkedInConnected
                          ? "Your LinkedIn account is ready for content generation"
                          : "Connect your LinkedIn account to enable token generation"}
                      </p>
                    </div>
                  </div>
                  {!isLinkedInConnected && (
                    <Button
                      onClick={connectLinkedIn}
                      disabled={isConnectingLinkedIn}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isConnectingLinkedIn ? "Connecting..." : "Connect LinkedIn"}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white border rounded p-2">
                    {isInstagramConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm">
                      {isInstagramConnected ? "Instagram Connected" : "Instagram Not Connected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white border rounded p-2">
                    {isRedditConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm">
                      {isRedditConnected ? "Reddit Connected" : "Reddit Not Connected"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={connectInstagram}
                    disabled={isInstagramConnecting}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    {isInstagramConnecting ? "Redirecting..." : "Connect Instagram"}
                  </Button>
                  <div className="flex items-center gap-2 bg-white border rounded p-2 justify-center">
                    {isRedditConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="text-sm">
                      Reddit disabled
                    </span>
                  </div>
                </div>

                {instagramUserToken && instagramPages.length === 0 && (
                  <div className="flex items-center justify-between p-3 bg-white border rounded">
                    <p className="text-sm text-gray-700">Load pages linked to your Instagram account.</p>
                    <Button size="sm" variant="outline" onClick={() => fetchInstagramPages(instagramUserToken)}>
                      Load Pages
                    </Button>
                  </div>
                )}

                {instagramPages.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Instagram Page</Label>
                    <div className="grid gap-2">
                      {instagramPages.map((page) => (
                        <Button
                          key={page.id}
                          variant={selectedInstagramPage?.id === page.id ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => selectInstagramPage(page)}
                        >
                          {page.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-requirements">Content Requirements</Label>
                <Textarea
                  id="content-requirements"
                  placeholder="Describe the kind of content you want to generate..."
                  value={contentRequirements}
                  onChange={(e) => setContentRequirements(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  placeholder="Add extra background, product story, or brand notes..."
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 font-medium">Load context</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setContextText(
                          "Noa is a creative strategist helping founders articulate vision and brand voice with concise, human storytelling."
                        )
                      }
                    >
                      Noa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setContextText(
                          "Friendsin is a network for career builders to swap opportunities, share insights, and grow together through peer support."
                        )
                      }
                    >
                      Friendsin
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setContextText(
                          "Herth is a community-driven platform/website built to empower women entrepreneurs to grow, connect, and thrive.\nOur mission is to close the gap between ambition and opportunity by creating an ecosystem where women entrepreneurs can find the visibility they require to grow .\nWe believe every entrepreneur deserves visibility, support, and the tools to turn potential into performance.\nHerth transforms isolated business journeys into shared experiences through meaningful networks and practical mentorship.\nWe champion sustainability, inclusivity, and long-term growth, not just short-term visibility.\nBy combining storytelling, discovery, and analytics, Herth helps women showcase their work to the world with confidence.\nOur goal is to make entrepreneurship more accessible, authentic, and community-powered.\nEvery feature is designed to spark engagement — whether it’s sharing a story, finding collaborators, or joining skill exchanges.\nHerth stands for a culture of reciprocity: when one woman rises, the whole community grows stronger.\nWe are building a space where trust replaces competition, and genuine connection drives progress.\nThis isn’t just a network — it’s a movement towards balanced opportunity and collective growth.\nAt Herth, ambition meets empathy, innovation meets inclusivity, and business meets belonging.\nWe exist to remind every entrepreneur: you are not alone in your journey.\n"
                        )
                      }
                    >
                      Herth
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setContextText(
                          "Komal is a founder spotlighting practical marketing playbooks and community-led growth tips for early-stage teams."
                        )
                      }
                    >
                      Komal
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Input
                    id="target-audience"
                    placeholder="e.g., Tech professionals, Entrepreneurs"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="bg-black text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post-tone">Post Tone</Label>
                  <Input
                    id="post-tone"
                    placeholder="e.g., Professional, Casual, Inspirational"
                    value={postTone}
                    onChange={(e) => setPostTone(e.target.value)}
                    className="bg-black text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Edit / Finalize Copy</Label>
                <Textarea
                  placeholder="Edit the generated content before posting..."
                  value={editedText || generatedPost?.content?.text || ""}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[140px]"
                />
              </div>

              <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={generateContent}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating Content..." : "Generate Post"}
                </Button>
                <Button
                  onClick={regenerateImages}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  disabled={!accessToken}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Regenerate Images
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Post Preview
              </CardTitle>
              <CardDescription>Preview your generated LinkedIn content</CardDescription>
            </CardHeader>
            <CardContent>
              {!generatedPost ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Generate content to see preview</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        AI
                      </div>
                      <div className = {' w-[80%]'}>
                        <h3 className="font-semibold text-gray-900">{generatedPost.content.name}</h3>
                        <p className="text-sm text-gray-600">{generatedPost.content.industry}</p>
                        <p className="text-xs text-gray-500">2h • 🌍</p>
                      </div>
                    </div>

                    {generatedPost.type === "carousel" ? (
                      <div className="space-y-4">
                        <p className="text-gray-900 whitespace-pre-line">{editedText || generatedPost.content.text}</p>

                        <div className="relative bg-gray-100 rounded-lg p-6 min-h-[200px]">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2">
                              {generatedPost?.content.slides[currentSlide]?.title}
                            </h4>
                            <img src={`${generatedPost?.content.slides[currentSlide].content}`} alt="Carousel slide" />
                          </div>

                          <div className="absolute inset-y-0 left-2 flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={prevSlide}
                              className="h-8 w-8 p-0 bg-white shadow-md"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute inset-y-0 right-2 flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={nextSlide}
                              className="h-8 w-8 p-0 bg-white shadow-md"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {generatedPost.content.slides.map((_: any, index: number) => (
                              <div
                                key={index}
                                className={`w-2 h-2 rounded-full ${
                                  index === currentSlide ? "bg-blue-600" : "bg-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">{generatedPost.content.title}</h3>
                        <p className="text-gray-900 whitespace-pre-line">{generatedPost.content.text}</p>
                      </div>
                    )}
                    {generatedPost.content.hashtags && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {generatedPost.content.hashtags.map((tag: any, index: number) => (
                          <span key={index} className="text-blue-600 text-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>👍 {generatedPost.content.engagement.likes}</span>
                        <span>💬 {generatedPost.content.engagement.comments}</span>
                        <span>🔄 {generatedPost.content.engagement.shares}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {currentSlide + 1}/{generatedPost.content.slides?.length || 1}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={postToLinkedIn}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!accessToken}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Post to LinkedIn
                  </Button>
                  <Button
                    onClick={regenerateImages}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!accessToken}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Regenerate Images
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      onClick={postToInstagram}
                      className="w-full bg-pink-600 hover:bg-pink-700"
                      disabled={!generatedPost || !instagramPageToken || !instagramUserId}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Post to Instagram
                    </Button>
                    <Button
                      onClick={postToReddit}
                      className="w-full bg-gray-400 hover:bg-gray-500"
                      disabled={true}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Reddit (disabled)
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>IG Caption (optional)</Label>
                      <Textarea
                        placeholder="Override caption..."
                        value={instagramCaptionOverride}
                        onChange={(e) => setInstagramCaptionOverride(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subreddit</Label>
                      <Input
                        placeholder="e.g. marketing"
                        value={redditSubreddit}
                        onChange={(e) => setRedditSubreddit(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
