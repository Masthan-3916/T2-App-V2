// src/pages/LandingPage.tsx
import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import StatCounter from '../components/ui/StatCounter';
import AOS from 'aos';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export default function LandingPage() {
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        AOS.init({
            duration: 1200,
            once: true,
            easing: 'ease-out-back',
            delay: 100,
        });
    }, []);

    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-orange-500/30 overflow-x-hidden">
            {/* Background Animations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        opacity: [0.1, 0.15, 0.1] 
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-600/20 blur-[150px] rounded-full" 
                />
                <motion.div 
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        rotate: [90, 0, 90],
                        opacity: [0.1, 0.2, 0.1] 
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full" 
                />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
                <div className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/20 group-hover:rotate-12 transition-all duration-500">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                        </div>
                        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent italic">FLEETOPS</span>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-12">
                        {['Features', 'Live Grid', 'Ecosystem', 'Pricing'].map((item) => (
                            <a 
                                key={item} 
                                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                                className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-orange-500 transition-all relative group"
                            >
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300" />
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-6">
                        <Link
                            to="/login"
                            className="hidden md:block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all"
                        >
                            Log In
                        </Link>
                        <a
                            href={`${API_URL}/auth/google`}
                            className="relative group px-8 py-3.5 bg-white text-slate-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all overflow-hidden shadow-2xl shadow-orange-500/10 active:scale-95"
                        >
                            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <span className="relative z-10 group-hover:text-white transition-colors duration-500">Deploy Now</span>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-60 pb-40 px-6 max-w-7xl mx-auto text-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900 border border-white/5 mb-10 shadow-2xl"
                >
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">v2.0 Operation Manifest Active</span>
                </motion.div>

                <h1 data-aos="fade-up" className="text-6xl md:text-[9rem] font-black tracking-tighter mb-10 leading-[0.8] text-white">
                    ELITE FLEET <br />
                    <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent italic px-4">COMMAND</span>
                </h1>

                <p data-aos="fade-up" data-aos-delay="200" className="text-xl md:text-2xl text-slate-500 max-w-4xl mx-auto mb-16 leading-relaxed font-bold tracking-tight">
                    Sub-second latency tracking. Predictive AI dispatching. <br className="hidden md:block" />
                    The world's most advanced logistics orchestration platform.
                </p>

                <div data-aos="fade-up" data-aos-delay="400" className="flex flex-col sm:flex-row items-center justify-center gap-8">
                    <a
                        href={`${API_URL}/auth/google`}
                        className="group relative px-12 py-6 bg-orange-600 hover:bg-orange-500 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(234,88,12,0.3)] flex items-center gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <span>Establish Connection</span>
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </a>
                </div>

                {/* Performance HUD */}
                <div data-aos="zoom-in" data-aos-delay="600" className="mt-40 relative group px-4">
                    <div className="absolute -inset-10 bg-gradient-to-r from-orange-500/10 to-blue-500/10 rounded-[5rem] blur-[100px] opacity-50" />
                    <div className="relative rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                        <div className="relative rounded-[2rem] overflow-hidden aspect-[21/9] bg-slate-950 border border-white/5">
                            <img
                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000"
                                alt="Neural Network"
                                className="w-full h-full object-cover opacity-20 scale-110 group-hover:scale-100 transition-transform duration-[10s]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 w-full max-w-7xl">
                                    {[
                                        { label: 'Uptime Reliability', end: 99.9, suffix: '%', decimals: 1 },
                                        { label: 'Latency Rate', end: 42, suffix: 'ms', prefix: '<' },
                                        { label: 'Active Assets', end: 1250, suffix: '+' },
                                        { label: 'Operations/Sec', end: 8.4, suffix: 'K', decimals: 1 }
                                    ].map((stat, i) => (
                                        <div key={i} data-aos="fade-up" data-aos-delay={i * 100} className="p-10 rounded-[2.5rem] bg-slate-950/60 border border-white/5 shadow-inner backdrop-blur-sm group-hover:border-orange-500/20 transition-colors">
                                            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] mb-4">{stat.label}</p>
                                            <p className="text-5xl font-black text-white tracking-tighter">
                                                <StatCounter {...stat} />
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Grid Showcase */}
            <section id="live-grid" className="py-40 px-8 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-32 items-center">
                    <div data-aos="fade-right">
                        <Badge label="Global Telemetry" />
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter mt-8 mb-10 leading-none">
                            REAL-TIME <br />
                            <span className="text-slate-600">ORCHESTRATION</span>
                        </h2>
                        <p className="text-slate-500 text-xl leading-relaxed mb-12 font-medium">
                            Don't just track. Orchestrate. Our neural dispatching engine eliminates 
                            idle time by predicting flow and automating the complex logic of fleet management.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                            {[
                                { t: 'Live GPS', d: 'Sub-meter accuracy' },
                                { t: 'Smart AI', d: 'Predictive routing' },
                                { t: 'Bio-Sync', d: 'Driver safety monitoring' },
                                { t: 'Instant Pay', d: 'Settlement on delivery' }
                            ].map((f, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <span className="text-white font-black text-xs uppercase tracking-widest">{f.t}</span>
                                    <span className="text-slate-600 text-xs font-bold uppercase">{f.d}</span>
                                </div>
                            ))}
                        </div>
                        <Link to="/login" className="inline-flex items-center gap-4 text-orange-500 text-xs font-black uppercase tracking-[0.2em] group">
                            Explore the live grid
                            <span className="w-10 h-px bg-orange-500 group-hover:w-16 transition-all" />
                        </Link>
                    </div>
                    
                    <div data-aos="fade-left" className="relative">
                        <div className="absolute inset-0 bg-orange-500/20 blur-[120px] rounded-full animate-pulse" />
                        <div className="relative rounded-[4rem] border border-white/10 bg-slate-900 shadow-2xl overflow-hidden aspect-square flex flex-col items-center justify-center p-12 text-center group">
                            <div className="absolute inset-0 opacity-60 bg-[url('/fleetops_tracking_mockup_1773542959401.png')] bg-cover mix-blend-screen group-hover:scale-110 transition-transform duration-[10s]" />
                            <div className="relative z-10 w-32 h-32 bg-slate-950/80 rounded-[3rem] border border-orange-500/50 flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(234,88,12,0.3)]">
                                <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20" />
                                <svg className="w-12 h-12 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                            </div>
                            <h3 className="relative z-10 text-white font-black text-2xl uppercase tracking-widest mb-4">Live Mission Terminal</h3>
                            <p className="relative z-10 text-slate-500 text-xs font-black uppercase tracking-widest leading-loose max-w-[200px] mx-auto opacity-80">Full telemetry available post-authentication</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Ecosystem Showcase */}
            <section id="ecosystem" className="py-40 px-8 max-w-7xl mx-auto border-t border-white/5">
                <div data-aos="fade-up" className="text-center mb-24">
                    <Badge label="Global Infrastructure" />
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mt-8 mb-10 leading-none uppercase">
                        Unified <br />
                        <span className="text-slate-600 italic">Ecosystem</span>
                    </h2>
                    <p className="text-slate-500 text-xl max-w-3xl mx-auto font-medium">
                        Connect your existing supply chain to the world's most resilient logistics network. 
                        Our API-first architecture ensures seamless interoperability with global standards.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    {[
                        { name: 'SAP Integration', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                        { name: 'Oracle Cloud', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                        { name: 'Google Maps G2', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
                        { name: 'AWS High-Availability', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' }
                    ].map((item, i) => (
                        <div key={i} data-aos="zoom-in" data-aos-delay={i * 100} className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 text-center group hover:bg-orange-500/10 transition-all duration-500">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">{item.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-40 px-8 max-w-7xl mx-auto">
                <div data-aos="fade-up" className="text-center mb-24">
                    <Badge label="Operational Capacity" />
                    <h2 className="text-5xl md:text-7xl font-black tracking-tighter mt-8 mb-10 leading-none uppercase">
                        Investment <br />
                        <span className="text-slate-600">Models</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-end">
                    {[
                        { 
                            tier: 'Starter', 
                            price: '$0', 
                            desc: 'Individual fleet entry',
                            features: ['5 Asset Slots', 'Standard Grid', 'Community Auth'],
                            cta: 'Initiate Free'
                        },
                        { 
                            tier: 'Fleet Pro', 
                            price: '$199', 
                            desc: 'Growing organizations',
                            features: ['50 Asset Slots', 'Neural Dispatch', 'Priority Support', 'API Access'],
                            cta: 'Deploy Pro',
                            popular: true
                        },
                        { 
                            tier: 'Operational', 
                            price: 'Custom', 
                            desc: 'Enterprise grade scale',
                            features: ['Unlimited Assets', 'Neural Sync v2', 'SLA Guarantee', 'Dedicated Node'],
                            cta: 'Contact Command'
                        }
                    ].map((plan, i) => (
                        <div 
                            key={i} 
                            data-aos="fade-up" 
                            data-aos-delay={i * 100} 
                            className={`p-12 rounded-[3rem] transition-all duration-700 hover:scale-[1.05] ${
                                plan.popular 
                                ? 'bg-orange-600 shadow-[0_40px_100px_-20px_rgba(234,88,12,0.4)] relative z-10 scale-[1.1] pb-16' 
                                : 'bg-slate-900 border border-white/5'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-10 -translate-y-1/2 bg-white text-slate-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl">
                                    Highly Deployed
                                </div>
                            )}
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${plan.popular ? 'text-white/60' : 'text-slate-500'}`}>{plan.tier}</p>
                            <h3 className="text-5xl font-black tracking-tighter mb-4 text-white">
                                {plan.price}
                                {plan.price !== 'Custom' && <span className="text-xs opacity-50 ml-1 font-bold italic">/MO</span>}
                            </h3>
                            <p className={`text-xs font-bold mb-8 ${plan.popular ? 'text-white/80' : 'text-slate-400'}`}>{plan.desc}</p>
                            
                            <ul className="space-y-6 mb-12">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/90">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${plan.popular ? 'bg-white/20' : 'bg-orange-500/20'}`}>
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${
                                plan.popular ? 'bg-white text-orange-600 hover:bg-slate-100' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                            }`}>
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-40 px-8 bg-slate-950 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-12">
                    <div className="max-w-md">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                            </div>
                            <span className="text-2xl font-black italic tracking-tighter">FLEETOPS</span>
                        </div>
                        <p className="text-slate-600 font-bold text-lg leading-relaxed mb-0">
                            Architecting the world's most resilient logistics networks. 
                            Built for organizations that demand absolute certainty on the move.
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-20">
                         <div>
                            <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-10">Intelligence</p>
                            <ul className="space-y-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                <li><a href="#" className="hover:text-orange-500">Global Grid</a></li>
                                <li><a href="#" className="hover:text-orange-500">Predictive Hub</a></li>
                                <li><a href="#" className="hover:text-orange-500">Audit Trail</a></li>
                            </ul>
                         </div>
                         <div>
                            <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-10">Resources</p>
                            <ul className="space-y-6 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                <li><a href="#" className="hover:text-orange-500">API Documentation</a></li>
                                <li><a href="#" className="hover:text-orange-500">Driver SDK</a></li>
                                <li><a href="#" className="hover:text-orange-500">Case Studies</a></li>
                            </ul>
                         </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-20 mt-40 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                     <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.5em]">© 2026 FLEETOPS CORE INDUSTRIAL SYSTEMS</p>
                     <div className="flex gap-12 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                        <a href="#">Security</a>
                        <a href="#">Compliance</a>
                        <a href="#">Interoperability</a>
                     </div>
                </div>
            </footer>
        </div>
    );
}

function Badge({ label }: { label: string }) {
    return (
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900/50 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-20"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            {label}
        </div>
    );
}
