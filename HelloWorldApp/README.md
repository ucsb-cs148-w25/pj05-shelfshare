# **Hello World App**

A simple React Native web app built with Expo and deployed to Vercel. This document outlines the steps to build and deploy the app.

---

## **Getting Started**

### **1. Prerequisites**
Ensure the following tools are installed:
- [Node.js](https://nodejs.org/) (LTS version recommended, e.g., Node.js 18)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- Expo CLI (local version)

Install the Expo CLI (local version):
```bash
npm install expo
```

```bash
npm install -g vercel
```

### **Building the App**
1. Initialize the App
```bash
npx create-expo-app hello-world-app
```
2. Build the app
```bash
npx expo build:web
```

### **Deploying to Vercel**
1. Navigate to the Build directory
```bash
cd web-build
```
2. Deploy the App
```bash
vercel --prod --public
```

creates the link: https://hello-world-3xupl6wmg-niyatis-projects-b4ef6fcc.vercel.app/

