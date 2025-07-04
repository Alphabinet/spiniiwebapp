#!/bin/bash

# CollabSphere Setup Script
echo "🚀 Setting up CollabSphere with Next.js 15..."

# Create project directory
mkdir collabsphere
cd collabsphere

# Initialize Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Install dependencies
echo "📦 Installing dependencies..."
npm install @radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-radio-group @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs class-variance-authority clsx lucide-react tailwind-merge tailwindcss-animate

echo "✅ Setup complete! Run 'npm run dev' to start the development server."
echo "🌐 Open http://localhost:3000 to view your CollabSphere application."
