"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { SparklesCore } from "@/components/ui/sparkles";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { motion } from "framer-motion";
import {
  FileText,
  Zap,
  BarChart3,
  Palette,
  Upload,
  Download,
  Sparkles,
  Bot,
  GitBranch,
  Wand2,
  Coffee,
  Heart,
  Github,
  Twitter,
  Star,
  ArrowRight,
  Code2,
  BookOpen,
} from "lucide-react";

const features = [
  {
    title: "Live Preview",
    description:
      "See your Markdown rendered in real-time as you type with sub-300ms debounced updates. What you write is what you get.",
    icon: <Zap className="w-8 h-8 text-blue-500" />,
  },
  {
    title: "Mermaid Diagrams",
    description:
      "Create flowcharts, sequence diagrams, Gantt charts, and more — rendered client-side with full dark mode support.",
    icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
  },
  {
    title: "Beautiful PDF Export",
    description:
      "Export high-quality PDFs with customizable page size, margins, headers, footers, and print backgrounds.",
    icon: <Palette className="w-8 h-8 text-pink-500" />,
  },
  {
    title: "File Upload",
    description:
      "Drag and drop or browse to upload existing .md files instantly into the editor.",
    icon: <Upload className="w-8 h-8 text-emerald-500" />,
  },
  {
    title: "HTML Export",
    description:
      "Export as single-file HTML with embedded styles, perfect for sharing static documents anywhere.",
    icon: <Download className="w-8 h-8 text-orange-500" />,
  },
  {
    title: "Syntax Highlighting",
    description:
      "Beautiful code blocks with automatic language detection and highlighting powered by highlight.js.",
    icon: <Code2 className="w-8 h-8 text-cyan-500" />,
  },
  {
    title: "Math Equations",
    description:
      "Write LaTeX math expressions inline or in blocks — rendered beautifully with KaTeX automatically.",
    icon: <BookOpen className="w-8 h-8 text-yellow-500" />,
  },
  {
    title: "Auto Save",
    description:
      "Your work is automatically saved to localStorage so you never lose progress between sessions.",
    icon: <FileText className="w-8 h-8 text-teal-500" />,
  },
  {
    title: "GFM Support",
    description:
      "Full GitHub Flavored Markdown support including tables, strikethrough, task lists, and footnotes.",
    icon: <Github className="w-8 h-8 text-slate-500 dark:text-slate-300" />,
  },
];

const aiFeatures = [
  {
    icon: <Wand2 className="w-6 h-6" />,
    title: "AI Content Enhancement",
    description:
      "Smart AI-powered suggestions to improve your writing clarity, grammar, and style as you type.",
    tag: "Coming Soon",
  },
  {
    icon: <Bot className="w-6 h-6" />,
    title: "AI Document Generation",
    description:
      "Generate full document drafts from a simple prompt or outline — powered by leading LLMs.",
    tag: "Coming Soon",
  },
  {
    icon: <GitBranch className="w-6 h-6" />,
    title: "Smart Mermaid Fix",
    description:
      "AI automatically detects and fixes broken or invalid Mermaid diagram syntax in real-time.",
    tag: "Coming Soon",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Auto Summarization",
    description:
      "One-click AI summarization to generate TL;DR sections, abstracts, or executive summaries.",
    tag: "Coming Soon",
  },
];

export default function Home() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden">
      {/* ─── Floating Navbar ─────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-violet-50/80 dark:bg-slate-950/60 border-b border-violet-200/60 dark:border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dry<span className="text-blue-500 dark:text-blue-400">MDF</span>
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link
            href="#features"
            className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="#ai"
            className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            AI Roadmap
          </Link>
          <Link
            href="#support"
            className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Support
          </Link>
          <ThemeToggle />
          <Link
            href="/editor"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Open Editor
          </Link>
        </motion.div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 bg-white dark:bg-slate-950">
        {/* Radial indigo/pink glow — light mode only */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(ellipse 75% 60% at 50% 45%, rgba(167,139,250,0.45) 0%, rgba(236,72,153,0.25) 35%, rgba(199,210,254,0.15) 60%, transparent 75%)",
          }}
        />

        {/* Background Beams — dark mode only */}
        {!isLight && <BackgroundBeams className="opacity-70" />}

        {/* Sparkles overlay */}
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            particleColor={isLight ? "#3730A3" : "#93C5FD"}
            particleDensity={80}
            background="transparent"
            minSize={0.5}
            maxSize={1.4}
          />
        </div>

        {/* Radial gradient vignette */}
        <div className="absolute inset-0 bg-radial-gradient" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-300/60 bg-indigo-100/60 text-indigo-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 text-sm font-medium mb-8"
          >
            <Star className="w-3.5 h-3.5 fill-indigo-500 dark:fill-blue-400" />
            Open Source · MIT License
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900 dark:text-white"
          >
            Write Beautiful
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-purple-400 to-blue-400">
              Documents from Markdown
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A modern, open-source Markdown editor with live preview, Mermaid
            diagram support, KaTeX math, and high-quality PDF &amp; HTML export.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link
              href="/editor"
              className="group flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-105"
            >
              Start Writing Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://github.com/ajay-mandal/drymdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-semibold transition-all duration-200 border border-slate-800 dark:border-slate-700/80 hover:scale-105"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </motion.div>

          {/* Hero visual hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm"
          >
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              No download needed for preview
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              100% client-side preview
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Offline-ready
            </span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 dark:text-slate-400"
        >
          <span className="text-xs">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-5 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-start justify-center p-1"
          >
            <div className="w-1 h-2 bg-slate-400 dark:bg-slate-500 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────────── */}
      <section className="border-y border-violet-200/50 dark:border-slate-800 bg-violet-100/60 dark:bg-slate-900/50 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: "9+", label: "Feature-rich" },
              { value: "< 300ms", label: "Preview latency" },
              { value: "100%", label: "Open source" },
              { value: "MIT", label: "License" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features Section ────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
              <Zap className="w-3.5 h-3.5" />
              Everything you need
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Powerful features,{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-blue-500 dark:from-purple-400 dark:to-blue-400">
                zero friction
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              DryMDF packs everything you need to write, preview, and export
              professional Markdown documents — right in your browser.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <HoverEffect items={features} />
          </motion.div>
        </div>
      </section>

      {/* ─── AI Future Section ───────────────────────────────── */}
      <section
        id="ai"
        className="relative py-24 px-6 overflow-hidden bg-violet-100 dark:bg-slate-900"
      >
        <ShootingStars
          starColor="#818CF8"
          trailColor="#60A5FA"
          minDelay={1000}
          maxDelay={3500}
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-violet-100/90 dark:to-slate-950/80 pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-4">
              <Bot className="w-3.5 h-3.5" />
              The future of DryMDF
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              AI-powered enhancements{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400">
                on the way
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              We&apos;re building intelligent AI features directly into the
              editor — from smart content suggestions to automatic diagram
              repair.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {aiFeatures.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative group p-6 rounded-2xl border border-violet-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-colors shadow-sm dark:shadow-none overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-br from-indigo-500/5 to-purple-500/5" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      {feature.icon}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-violet-200 dark:border-slate-600">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mermaid fix callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-8 p-6 rounded-2xl border border-purple-400/30 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/5 backdrop-blur-sm shadow-sm dark:shadow-none"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-slate-900 dark:text-white font-semibold">
                    Mermaid Diagram Smart Repair
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                    Active Fix
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  We&apos;re actively working on improving Mermaid diagram
                  rendering. Known issues with complex nested diagrams and
                  certain special characters are being addressed. An AI-powered
                  syntax validator will provide real-time feedback and
                  auto-corrections for invalid diagram definitions.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── How it Works ────────────────────────────────────── */}
      <section className="py-24 px-6 bg-violet-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Get started in{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400">
                3 steps
              </span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Write or Upload",
                description:
                  "Type Markdown in the editor or drag-and-drop your existing .md file.",
                icon: <FileText className="w-6 h-6 text-blue-400" />,
              },
              {
                step: "02",
                title: "Preview Instantly",
                description:
                  "The live preview panel updates in real-time with full GFM, math, and Mermaid support.",
                icon: <Zap className="w-6 h-6 text-purple-400" />,
              },
              {
                step: "03",
                title: "Export Beautifully",
                description:
                  "Download a polished PDF or single-file HTML with one click. Customise page size, margins, and more.",
                icon: <Download className="w-6 h-6 text-emerald-400" />,
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                {idx < 2 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+40px)] right-0 h-px bg-linear-to-r from-slate-300 dark:from-slate-700 to-transparent" />
                )}
                <div className="w-12 h-12 rounded-2xl border border-violet-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 shadow-sm dark:shadow-none flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-mono text-slate-400 dark:text-slate-600 mb-2">
                  {item.step}
                </div>
                <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Support / Contribution Section ─────────────────── */}
      <section
        id="support"
        className="relative py-24 px-6 overflow-hidden bg-linear-to-b from-violet-100 to-violet-50 dark:from-slate-950 dark:to-slate-900"
      >
        <div className="absolute inset-0 opacity-20">
          <SparklesCore
            particleColor="#F59E0B"
            particleDensity={30}
            background="transparent"
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium mb-6">
              <Heart className="w-3.5 h-3.5 fill-amber-400" />
              Support the project
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
              Love DryMDF?
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400">
                Buy me a coffee ☕
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
              DryMDF is completely free and open source. If it saves you time, a
              small contribution helps keep the project alive and lets me build
              those AI features faster!
            </p>

            {/* About the Creator card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              viewport={{ once: true }}
              className="mb-10 p-6 rounded-2xl border border-violet-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm text-left shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white text-base">
                      Ajay Mandal
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-medium">
                      Creator
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    I&apos;m a software developer who got tired of wrestling
                    with complex document tooling just to produce clean PDFs
                    from Markdown. DryMDF started as a personal tool and grew
                    into something I wanted to share with the community.
                    I&apos;m currently building AI-assisted writing features
                    solo — every coffee and star genuinely motivates me to keep
                    shipping.
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <a
                      href="https://github.com/ajay-mandal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      ajay-mandal
                    </a>
                    <span className="text-slate-300 dark:text-slate-600">
                      |
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Building in public · Open Source
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="https://buymeacoffee.com/ajaymandal"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-amber-400/30"
              >
                <Coffee className="w-5 h-5" />
                Buy Me a Coffee
              </a>
              <a
                href="https://github.com/sponsors/ajay-mandal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-violet-100 dark:bg-slate-800 hover:bg-violet-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-200 border border-violet-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-slate-600 hover:scale-105"
              >
                <Heart className="w-5 h-5 text-pink-500 dark:text-pink-400" />
                GitHub Sponsors
              </a>
              <a
                href="https://github.com/ajay-mandal/drymdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-violet-100 dark:bg-slate-800 hover:bg-violet-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-200 border border-violet-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-slate-600 hover:scale-105"
              >
                <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                Star on GitHub
              </a>
            </div>

            <p className="mt-8 text-slate-500 dark:text-slate-500 text-sm">
              Every ⭐ star and ☕ coffee directly funds new features and
              maintenance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────── */}
      <section className="py-20 px-6 bg-violet-100 dark:bg-slate-900 border-y border-violet-200/50 dark:border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Ready to write better documents?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
              Open the editor, write in Markdown, preview live, and export
              beautifully — all in your browser.
            </p>
            <Link
              href="/editor"
              className="group inline-flex items-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:scale-105"
            >
              Open Editor — It&apos;s Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="py-12 px-6 bg-violet-50 dark:bg-slate-950 border-t border-violet-200/50 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">
                  Dry
                  <span className="text-blue-500 dark:text-blue-400">MDF</span>
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
                A modern, open-source Markdown to PDF converter built with
                Next.js and NestJS. Free forever.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://github.com/ajay-mandal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/ajaymandal01"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-semibold text-sm mb-3">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li>
                  <Link
                    href="/editor"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Editor
                  </Link>
                </li>
                <li>
                  <a
                    href="#features"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#ai"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    AI Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-900 dark:text-white font-semibold text-sm mb-3">
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li>
                  <a
                    href="https://github.com/ajay-mandal/drymdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ajay-mandal/drymdf/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Contributing
                  </a>
                </li>
                <li>
                  <a
                    href="#support"
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-violet-200/50 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 dark:text-slate-500">
            <p>© {new Date().getFullYear()} DryMDF · MIT License</p>
            <p>
              Built with ❤️ using{" "}
              <a
                href="https://nextjs.org"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Next.js
              </a>{" "}
              &amp;{" "}
              <a
                href="https://nestjs.com"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                NestJS
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
