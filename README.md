<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1NJnAjd6l1Mj5qsU3ckCHZ9qqG5fAicpw

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This app is configured for easy deployment to Vercel:

1. **Push to GitHub**: Ensure your repository is pushed to GitHub
2. **Import to Vercel**: 
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project" and import your repository
3. **Configure Environment Variables**:
   - Add `GEMINI_API_KEY` as an environment variable in Vercel project settings
4. **Deploy**: Vercel will automatically build and deploy your app

The `vercel.json` configuration file ensures proper routing and build settings for the Vite-powered React application.
