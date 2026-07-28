# 📸 Insta Parser — Instagram Export Archive Viewer & Analytics Platform

**Insta Parser** is a high-performance single-page web application built with **Next.js**, **Supabase**, and **Cloudinary** that lets you upload, parse, inspect, and analyze exported Instagram data archives (`.zip` files in JSON or HTML format).

---

## ✨ Features

- **🚀 Client-Side ZIP Extraction**: Unpack full Instagram export `.zip` archives directly in browser memory using **JSZip** without server disk dependencies.
- **🔄 Non-Destructive Multi-Archive Merging**: Safely merge multiple Instagram export archives over time without duplicate records or lost data.
- **📸 Posts & Multi-Photo Carousels**: 
  - Complete post grid with `<Layers />` indicators for multi-photo carousel posts.
  - Lightbox modal with interactive carousel navigation (previous/next arrows, counter badge `1 / 3`, and pagination dots).
  - Smart 60-second timestamp window & Instagram Media ID deduplication engine.
- **🎥 Stories Archive**: Extract and view exported stories with image and video support.
- **💬 Direct Messaging Architecture**:
  - Full-height chat interface with sticky date section headers.
  - **4-Mode Unified API Pagination**:
    - **Default Mode**: Recent message stream.
    - **beforeDate Mode**: Infinite scroll UP for past history.
    - **afterDate Mode**: Infinite scroll DOWN for future history.
    - **aroundId Mode**: Instant context window jump to searched messages.
  - Smooth scroll position preservation when loading older messages.
  - Shared Media & Links gallery modal (Photos, Videos, Audio Notes, Reels, Links).
- **👥 Connections & Privacy Analytics**: Filterable views for Followers, Following, Close Friends, Blocked Accounts, and Follow Requests.
- **🛡️ Mojibake UTF-8 Character Decoding**: Fixes Instagram's corrupted latin-1 UTF-8 byte encodings (`\u00f0\u009f...`), restoring clean Arabic text, emojis, and unicode symbols.
- **☁️ Cloudinary CDN Integration**: Uploads post photos, story videos, DM media, and profile avatars directly to Cloudinary for fast global CDN rendering.
- **⚡ 100% RTK Query Lazy Hooks**: Optimized client-side state and data fetching using Redux Toolkit Query (`useLazy...Query`).

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **State & Data Fetching**: [Redux Toolkit (RTK Query)](https://redux-toolkit.js.org/rtk-query/overview)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL & Authentication)
- **CDN Storage**: [Cloudinary](https://cloudinary.com/) (REST Media Uploads)
- **Styling**: Vanilla CSS & [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **ZIP Parser**: [JSZip](https://stuk.github.io/jszip/)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **pnpm** (or `npm` / `yarn`)
- **Supabase Project** (Database & Authentication enabled)
- **Cloudinary Account** (Cloud Name, API Key, API Secret)

---

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

### 3. Database Setup

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the provided [`schema.sql`](./schema.sql) script to generate the database schema and table constraints (`profiles`, `posts`, `post_media`, `stories`, `conversations`, `messages`, `connections`, `activity_logs`).

---

### 4. Installation & Local Development

```bash
# Clone the repository
git clone https://github.com/AS-DEVELOPER7/insta-parser.git
cd insta-parser

# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
Insta-Parser/
├── schema.sql                           # Database tables & constraints
├── src/
│   ├── app/                             # Next.js App Router pages & API routes
│   │   ├── api/                         # Backend REST endpoints (/profile, /messages, etc.)
│   │   ├── profile/                     # Profile & Posts grid page
│   │   ├── direct/                      # Direct Messages page
│   │   ├── preferences/                 # Account Preferences & Ad settings
│   │   ├── connections/                 # Followers & Following page
│   │   ├── activity-log/                # Search history & Link logs
│   │   ├── media/                       # Extracted Media Vault
│   │   └── upload/                      # Archive ZIP ingestion dashboard
│   ├── components/                      # Atomic design UI components
│   │   ├── atoms/                       # Skeletons, Spinners, Badges
│   │   ├── molecules/                   # Media items, Message bubbles
│   │   ├── organisms/                   # Profile header, Chat window, Vault grid
│   │   └── templates/                   # Main Layout template
│   ├── lib/
│   │   ├── parser/                      # Archive parsing engine
│   │   │   ├── zipResolver.js           # JSZip indexing & file categorization
│   │   │   ├── postParser.js            # Post & carousel parser with ID deduplication
│   │   │   ├── storyParser.js           # Story extraction module
│   │   │   ├── messageParser.js         # Chat thread & DM media parser
│   │   │   ├── connectionParser.js      # Followers/Following list parser
│   │   │   ├── activityParser.js        # Searches & link history parser
│   │   │   ├── preferencesParser.js     # Profile info & ad settings parser
│   │   │   ├── jsonDecoder.js           # Mojibake UTF-8 character decoder
│   │   │   ├── uploader.js              # Cloudinary binary blob uploader
│   │   │   └── dataMerger.js            # Master 7-phase database ingestion engine
│   │   └── supabase/                    # Supabase client/server initializers
│   └── store/                           # Redux store & RTK Query apiSlice
│       └── api/apiSlice.js              # Lazy query RTK API slice definition
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

Created & Maintained by **[AS-DEVELOPER7](https://github.com/AS-DEVELOPER7)**.
