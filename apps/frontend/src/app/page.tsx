import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <main className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dry<span className="text-blue-600 dark:text-blue-400">PDF</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Modern Markdown to PDF converter with live preview, Mermaid diagram
            support, and beautiful exports
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/editor"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            Start Writing
          </Link>
          <a
            href="https://github.com/ajay-mandal/drypdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl border border-slate-200 dark:border-slate-700"
          >
            View on GitHub
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Live Preview
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              See your Markdown rendered in real-time as you type
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Mermaid Diagrams
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Create flowcharts, sequence diagrams, and more
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-white">
              Beautiful Exports
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Export to PDF or HTML with customizable styling
            </p>
          </div>
        </div>

        <footer className="mt-16 text-sm text-slate-500 dark:text-slate-400">
          <p>Open source • Built with Next.js and NestJS • MIT License</p>
        </footer>
      </main>
    </div>
  );
}
