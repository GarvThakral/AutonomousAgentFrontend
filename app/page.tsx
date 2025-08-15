"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Upload,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL


export default function LinkedInAIAgent() {
  const [user, setUser] = useState<any>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [contentRequirements, setContentRequirements] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [postTone, setPostTone] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<any>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const userSession = localStorage.getItem("user_session")
    if (!userSession) {
      router.push("/auth/login")
      return
    }

    try {
      const userData = JSON.parse(userSession)
      setUser(userData)

      const linkedInConnection = localStorage.getItem("linkedin_connected")
      if (linkedInConnection === "true") {
        setIsLinkedInConnected(true)
      }

      const existingToken = localStorage.getItem("access_token")
      if (existingToken) {
        setAccessToken(existingToken)
      }
    } catch (error) {
      router.push("/auth/login")
    }
  }, [router])

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

  const MAX_FILE_SIZE_MB = 2

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  console.log("handleFileUpload triggered");

  const file = event.target.files?.[0];
  console.log("Selected file:", file);

  // get user_session and extract ID
  const userSession = localStorage.getItem("user_session");
  console.log("Raw user_session from localStorage:", userSession);

  let userId = null;
  if (userSession) {
    try {
      const parsed = JSON.parse(userSession);
      console.log("Parsed user_session:", parsed);
      userId = parsed;
      console.log("Extracted user_id:", userId);
    } catch (e) {
      console.error("Failed to parse user_session JSON:", e);
    }
  }

  if (!userId) {
    console.warn("No user_id found — stopping upload");
    toast({
      title: "User not logged in",
      description: "Please log in before uploading a file.",
      variant: "destructive",
    });
    return;
  }

  if (!file) {
    console.warn("No file selected");
    return;
  }

  // Check type
  if (!(file.type === "text/csv" || file.name.endsWith(".csv"))) {
    console.warn("Invalid file type:", file.type);
    toast({
      title: "Invalid file type",
      description: "Please upload a CSV file.",
      variant: "destructive",
    });
    return;
  }

  // Check size
  const fileSizeMB = file.size / (1024 * 1024);
  console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);

  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    toast({
      title: "File too large",
      description: `The file exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
      variant: "destructive",
    });
    return;
  }

  setCsvFile(file);

  try {
    console.log("Preparing FormData...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    console.log("Sending upload request to:", `${process.env.NEXT_PUBLIC_API_URL}upload-csv`);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}upload-csv`, {
      method: "POST",
      body: formData,
    });

    console.log("Upload response status:", response.status);

    if (!response.ok) {
      console.error("Upload failed:", response.statusText);
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Upload successful, backend response:", data);

    toast({
      title: "File uploaded successfully",
      description: `${file.name} has been uploaded and processed.`,
    });
  } catch (error) {
    console.error("Error during file upload:", error);
    toast({
      title: "Upload error",
      description: "There was a problem uploading the file.",
      variant: "destructive",
    });
  }
};



  const connectLinkedIn = async () => {
    setIsConnectingLinkedIn(true)
    
    const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI 
    const CLIENT_ID = "86hk0lsdjculis"
    
    const scopes = [
      'profile',           // Basic profile info (name, photo, etc.) 
      'email',            // Email address
      'openid',           // OpenID Connect (for user identification)
      'w_member_social'   // Post content
    ].join('%20') 
    // Immediately redirect - no setTimeout needed
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}&state=random123`
  }

  const generateAccessToken = async () => {
    if (!isLinkedInConnected) {
      toast({
        title: "LinkedIn not connected",
        description: "Please connect your LinkedIn account first.",
        variant: "destructive",
      })
      return
    }

    const mockToken = `linkedin_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("linkedin_access_token", mockToken)
    setAccessToken(mockToken)
    toast({
      title: "Access token generated",
      description: "LinkedIn access token has been saved to local storage.",
    })
  }

  const generateContent = async () => {
    if (!csvFile || !contentRequirements) {
      toast({
        title: "Missing information",
        description: "Please upload a CSV file and provide content requirements.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    setTimeout(async () => {
      try {
        const response = await axios.post(
          `${API_URL}makepost`,
          {
            contentRequirements,
            targetAudience,
            postTone,
          }
        );
        console.log(response.data)
        let slide = []
        slide = [...response.data.content_data.image_instructions]
        let content = []
        content = [...response.data.image_urls]
        let slides = []
        for(let i =0 ; i < content.length ;i++){
          const obj = {
            title:slide[i],
            content:content[i]
          }
          slides.push(obj)
        }
        let hashString = response.data.content_data.hashtag_suggestions.join(' ')
        console.log(hashString)
        const mockPost = {
          // type: Math.random() > 0.5 ? "carousel" : "article",
          type:"carousel",
          content: {
            title: "🚀 The Future of AI in Personal Branding",
            text: `${response.data.content_data.content_draft} ${hashString}`,
            slides:slides,
            hashtags:response.data.hashtag_suggestions,
            engagement: {
              likes: Math.floor(Math.random() * 500) + 50,
              comments: Math.floor(Math.random() * 50) + 5,
              shares: Math.floor(Math.random() * 25) + 2,
            },
          },
        }
        setGeneratedPost(mockPost)
        setIsGenerating(false)
        toast({
          title: "Content generated successfully",
          description: "Your LinkedIn post has been created!",
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
    });
    return;
  }

  if (!generatedPost) {
    toast({
      title: "No content generated",
      description: "Please generate content before posting.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    const payload = {
      content_data: generatedPost.content,         
      image_urls: generatedPost.content.slides
        ? generatedPost.content.slides.map((slide: any) => slide.content)
        : [],
      post_type: "carousel",               
      access_token: accessToken                    
    };
    
    const response = await axios.post(`${API_URL}postcontent`, payload);
    if (response.data.status === "success") {
      toast({
        title: "Posted to LinkedIn!",
        description: "Your content has been successfully published.",
      });
    } else {
      toast({
        title: "Posting failed",
        description: "There was an error posting your content.",
        variant: "destructive",
      });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post to LinkedIn.",
        variant: "destructive",
      });
      console.error(error);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">INFLUENCE OS</h1>
            <p className="text-xl text-gray-600">AI-Powered LinkedIn Content Generator</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">{user.name || user.email}</span>
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
              <CardDescription>Upload your profile data and configure your content preferences</CardDescription>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv-upload">Profile Data (CSV File)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">{csvFile ? csvFile.name : "Click to upload CSV file"}</p>
                    <p className="text-xs text-gray-500 mt-1">Supported format: .csv</p>
                  </label>
                </div>
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

              <div className="space-y-3">

                <Button
                  onClick={generateContent}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating Content..." : "Generate LinkedIn Post"}
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
                      <div>
                        <h3 className="font-semibold text-gray-900">Your Name</h3>
                        <p className="text-sm text-gray-600">AI Content Creator • 1st</p>
                        <p className="text-xs text-gray-500">2h • 🌍</p>
                      </div>
                    </div>

                    {generatedPost.type === "carousel" ? (
                      <div className="space-y-4">
                        <p className="text-gray-900 whitespace-pre-line">{generatedPost.content.text}</p>

                        <div className="relative bg-gray-100 rounded-lg p-6 min-h-[200px]">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold mb-2">
                              {generatedPost?.content.slides[currentSlide]?.title}
                            </h4>
                            <img src = {`${generatedPost?.content.slides[currentSlide].content}`}>
                            </img>
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
                        {generatedPost.content.hashtags.map((index:any, tag:any) => (
                          <span key={index} className="text-blue-600 text-sm">{tag}</span>
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
