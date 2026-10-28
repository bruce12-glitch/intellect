import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Zap, 
  Link2, 
  Tag, 
  MessageSquare, 
  BookOpen,
  Shield,
  Download,
  Chrome,
  Smartphone,
  ArrowRight,
  Check,
  Star,
  Users,
  Clock,
  Sparkles,
  GraduationCap,
  Headphones,
  FileText,
  Youtube,
  Feather,
  Globe,
  Lock,
  ChevronRight
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI Summaries',
    description: 'Instant summaries of videos, podcasts, PDFs, and articles. Read or listen in a voice you can clone.',
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    icon: Link2,
    title: 'Auto-Connections',
    description: 'Your knowledge organizes itself with smart tags that get smarter over time. Everything connects automatically.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: MessageSquare,
    title: 'Chat with Your Knowledge',
    description: 'Ask questions and get answers grounded in your saved content. Choose GPT, Claude, or Gemini.',
    gradient: 'from-orange-500 to-red-600',
  },
  {
    icon: BookOpen,
    title: 'Spaced Repetition Quizzes',
    description: 'Turn your forgetting curve into a learning curve with automated quizzes on a personalized schedule.',
    gradient: 'from-violet-500 to-indigo-600',
  },
  {
    icon: Globe,
    title: 'Browser Extensions',
    description: 'Save from anywhere with one click. Chrome, Safari, Edge, Firefox extensions available.',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile Apps',
    description: 'Pick up where you left off on iOS and Android. Your knowledge base goes everywhere you do.',
    gradient: 'from-cyan-500 to-blue-600',
  },
];

const supportedContent = [
  { icon: Youtube, label: 'YouTube', color: 'bg-red-500' },
  { icon: Headphones, label: 'Podcasts', color: 'bg-green-500' },
  { icon: FileText, label: 'PDFs', color: 'bg-orange-500' },
  { icon: Feather, label: 'Articles', color: 'bg-blue-500' },
  { icon: BookOpen, label: 'Wikipedia', color: 'bg-gray-500' },
  { icon: Sparkles, label: 'Recipes', color: 'bg-pink-500' },
  { icon: Zap, label: 'TikToks', color: 'bg-black' },
  { icon: FileText, label: 'Notes', color: 'bg-indigo-500' },
];

const testimonials = [
  {
    quote: 'Think of it as a library of everything you\'ve read and watched, with an AI sitting on top that has read it too. Recall makes that easier than anything else we tried.',
    author: 'Tiago Forte',
    role: 'Author of Building a Second Brain',
    avatar: 'TF',
  },
  {
    quote: 'Recall works the way your brain works! Perfect for deep research or growing your knowledge on any topic.',
    author: 'Jason Calacanis',
    role: 'Founder, LAUNCH',
    avatar: 'JC',
  },
  {
    quote: 'I love Recall\'s interface, its speed, and its overall user experience... it is scratching my web-hoarding itch unlike anything else has quite been able to do to date.',
    author: 'Casey Newton',
    role: 'Founder, Platformer',
    avatar: 'CN',
  },
  {
    quote: 'One of my favorite AI apps is Recall. I\'ve used it constantly for almost a year to manage and transcribe all the videos we create and work with.',
    author: 'Jason Lemkin',
    role: 'Founder, SaaStr',
    avatar: 'JL',
  },
];

const stats = [
  { value: '700K+', label: 'Professionals' },
  { value: '4.7/5', label: 'Rating' },
  { value: '464', label: 'Reviews' },
  { value: '6+', label: 'Content Sources' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Intellect</span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link href="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Use Cases
                </Link>
                <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Docs
                </Link>
                <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/download" className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Download className="h-4 w-4" />
                Download
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/signup">
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              <span>New: AI Quizzes & Spaced Repetition</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 animate-slide-in-from-bottom">
              AI gave everyone the same brain
            </h1>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground mb-6 animate-slide-in-from-bottom" style={{ animationDelay: '100ms' }}>
              <span className="text-primary">Your knowledge is your edge</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-in-from-bottom" style={{ animationDelay: '200ms' }}>
              Save what matters. Write what you think. Curate an AI that knows what you know.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-from-bottom" style={{ animationDelay: '300ms' }}>
              <Link href="/signup">
                <Button size="xl" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Sparkles className="h-5 w-5" />
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Watch Demo →
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '400ms' }}>
              No credit card required · 30 Day Refund on Premium · 24 Hour Support
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-20 animate-fade-in" style={{ animationDelay: '500ms' }}>
            <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60 text-sm font-medium">
              <span>Trusted by professionals at</span>
              <div className="flex items-center gap-6">
                {['Google', 'NVIDIA', 'Stanford', 'Bloomberg', 'Microsoft', 'LinkedIn', 'NYU'].map((name) => (
                  <span key={name} className="font-semibold">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              One living space for your knowledge and the AI you choose
            </h2>
            <p className="text-lg text-muted-foreground">
              Save, organize, and chat with everything you know in one app.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Save', description: 'Save videos, podcasts, PDFs, and more in one click.', icon: (Download), gradient: 'from-blue-500 to-purple-600' },
              { step: '02', title: 'Organize', description: 'Auto-tagged, connected, and visualized in a knowledge graph.', icon: (Tag), gradient: 'from-emerald-500 to-teal-600' },
              { step: '03', title: 'Ask', description: 'Chat with your knowledge using any model: GPT, Claude, Gemini.', icon: (MessageSquare), gradient: 'from-orange-500 to-red-600' },
              { step: '04', title: 'Remember', description: 'Quizzes and spaced repetition build long-term memory.', icon: (GraduationCap), gradient: 'from-violet-500 to-indigo-600' },
            ].map(({ step, title, description, icon: Icon, gradient }) => (
              <Card key={title} className="relative overflow-hidden transition-all hover:shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r" style={{ background: `linear-gradient(90deg, ${gradient.replace('from-', '').replace('to-', '')})` }} />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">{step}</span>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${gradient})` }}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Why people make Intellect part of their day
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              4.7/5 Based on 464 reviews
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="transition-all hover:shadow-xl">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4" style={{ background: `linear-gradient(135deg, ${feature.gradient})` }}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Content */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <FileText className="h-3 w-3 mr-1" />
              Supported Content
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Save anything with Intellect
            </h2>
            <p className="text-lg text-muted-foreground">
              From YouTube videos to PDFs, podcasts to articles — if you can link it, you can save it.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {supportedContent.map((item) => (
              <Link key={item.label} href="/supported-content" className="group">
                <Card className="text-center p-6 transition-all hover:shadow-lg hover:border-primary/50 group-hover:scale-[1.02]">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${item.color} text-white group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3 w-3 mr-1" />
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              Loved by professionals worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="h-full transition-all hover:shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              <Lock className="h-3 w-3 mr-1" />
              Security & Privacy
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
              You're safe with us
            </h2>
            <p className="text-lg text-muted-foreground">
              We do not use your data for any other purpose than providing a service to you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Data Ownership', description: 'Your data is yours and you have full control over it. We do not use your data for any other purpose than providing a service to you.' },
              { icon: Download, title: 'Data Portability', description: 'You can export all your data anytime in Markdown format, putting the power of portability and accessibility directly in your hands.' },
              { icon: Lock, title: 'Privacy Focused', description: 'Augmented browsing is local first, your knowledge base is stored safely in the cloud.' },
            ].map((item) => (
              <Card key={item.title} className="text-center p-6 transition-all hover:shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <item.icon className="h-7 w-7" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <p className="text-muted-foreground mt-2">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Ready to build your AI knowledge base?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join 700,000+ professionals who use Intellect to save, organize, and remember what matters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="xl" variant="secondary" className="gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Sparkles className="h-5 w-5" />
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo" className="text-lg font-medium underline hover:text-primary-foreground/80 transition-opacity">
              Watch Demo →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Intellect</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs">
                Save what matters. Write what you think. Curate an AI that knows what you know.
              </p>
              <div className="flex gap-4 mt-6">
                <a href="https://twitter.com/getintellect" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                  <Globe className="h-5 w-5" />
                </a>
                <a href="https://github.com/intellect" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                  <Link2 className="h-5 w-5" />
                </a>
                <a href="https://discord.gg/intellect" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Discord">
                  <MessageSquare className="h-5 w-5" />
                </a>
                <a href="https://youtube.com/@intellect" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="YouTube">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/use-cases" className="hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link href="/compare" className="hover:text-foreground transition-colors">Compare</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link href="/roadmap" className="hover:text-foreground transition-colors">Roadmap</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link href="/youtube-summarizer" className="hover:text-foreground transition-colors">YouTube Summarizer</Link></li>
                <li><Link href="/podcast-summarizer" className="hover:text-foreground transition-colors">Podcast Summarizer</Link></li>
                <li><Link href="/download" className="hover:text-foreground transition-colors">Download</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/fair-use" className="hover:text-foreground transition-colors">Fair Use Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Intellect. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/fair-use" className="hover:text-foreground transition-colors">Fair Use</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}