# 🚀 Influence OS Documentation

AI-Powered LinkedIn Content Generator  
Frontend & Backend Setup Guide

---

## ⚛️ Frontend Setup (Next.js)

**Requirements:**  
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

### 1️⃣ Clone and Enter the Project Directory

git clone https://github.com/GarvThakral/AutonomousAgentFrontend
cd AutonomousAgentFrontend


### 2️⃣ Install Dependencies
npm install --force

### 3️⃣ Run the Development Server

npm run dev

### Environment variables
NEXT_PUBLIC_API_URL = "http://localhost:8000/"
This is the url to your running backend if using locally

## 🖥️ Frontend User Guide

This guide helps you start using the Influence OS web application to generate AI-powered LinkedIn posts.

---

### 1️⃣ Account Registration & Login

- Open the app.
- **Sign up** with your name, email, and password.
- **Log in** using those credentials.

---

### 2️⃣ LinkedIn Authorization

- Click **Connect LinkedIn**.
- Complete the authorization flow to allow the app to post on your behalf.

---

### 3️⃣ Upload Your LinkedIn Profile Data (CSV)

Before generating content, upload your profile data:

#### 📤 How to Export Your LinkedIn Data

1. **Login** to LinkedIn in your browser.
2. Go to Settings > Data privacy > *Get a copy of your data*.
3. Select **"Download larger data archive"** (recommended) or **"Profile information"** only.
4. Click **Request archive** and follow verification steps.
5. LinkedIn will email you a download link within 10 minutes.
6. **Unzip the archive** on your computer.
7. Locate and upload the CSV file.  
   The CSV must include these columns:  
   `First Name`, `Last Name`, `Summary`, `Industry`, `Websites`

---

### 4️⃣ Generate LinkedIn Post

- Enter your **Content Requirements** (theme or idea for the post).
- Specify the **Target Audience** (e.g., Tech professionals, Entrepreneurs).
- Set the **Post Tone** (e.g., Professional, Casual, Inspirational).

Click **Generate LinkedIn Post**.

---

### 5️⃣ Preview and Post

- Your content preview will appear on the right.
- Review it.
- If satisfied, click **Post to LinkedIn**.
- Want a different result? Edit inputs and click **Generate** again.

---

### 📝 Quick Steps

| Step         | Action                                                 |
|--------------|--------------------------------------------------------|
| Sign Up      | Register, then log in                                  |
| Authorize    | Connect your LinkedIn account                          |
| Upload CSV   | Export, unzip, and upload your LinkedIn profile CSV    |
| Configure    | Set requirements, audience, and tone                   |
| Generate     | Generate your post and review in preview                |
| Post         | Share to LinkedIn or regenerate until satisfied        |

---

## ⚙️ Backend API Setup

### 1️⃣ Clone the Repository

