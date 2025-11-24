import Link from 'next/link'
import { BookOpen, MessageCircle, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Your Personal Canvas Learning Assistant
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Connect your Canvas account and get instant help with your courses, assignments, 
            and study materials using the power of AI.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-lg transition-colors"
            >
              Start Learning Now
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              Powerful Features for Better Learning
            </h3>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our AI assistant helps you stay organized, understand your materials, and achieve better grades.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Smart Conversations</h4>
              <p className="text-slate-600">
                Ask questions about your courses, assignments, and materials in natural language.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Secure & Private</h4>
              <p className="text-slate-600">
                Your Canvas credentials are encrypted and stored securely. We never share your data.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Instant Help</h4>
              <p className="text-slate-600">
                Get immediate answers about deadlines, grades, course content, and study materials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">
              How It Works
            </h3>
            <p className="text-lg text-slate-600">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Sign Up</h4>
              <p className="text-sm text-slate-600">Create your account and connect your Canvas API token</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Add Gemini Key</h4>
              <p className="text-sm text-slate-600">Enter your Google Gemini API key for AI assistance</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Start Chatting</h4>
              <p className="text-sm text-slate-600">Ask questions about your courses and get instant help</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                4
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">Learn Better</h4>
              <p className="text-sm text-slate-600">Get personalized study plans and ace your courses</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Learning Experience?
          </h3>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of students who are already using Canvas AI Assistant to succeed in their studies.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-medium text-lg transition-colors"
          >
            Get Started Now
            <MessageCircle className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2024 Canvas AI Assistant. Built with Next.js, Supabase, and Google Gemini.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
