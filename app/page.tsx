"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { nanoid } from "nanoid";
import { DocumentMeta } from "./types";

export default function Home() {
  const { user, signUp, login, resetPassword, loading, logout, error, message } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const docsRef = ref(db, "documentMetadata");
    return onValue(docsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allDocs = Object.entries(data).map(([id, values]: [string, any]) => ({
          id,
          title: values.title,
          lastModified: values.lastModified,
          ownerName: values.ownerName,
          ownerEmail: values.ownerEmail,
        }));
        setDocs(allDocs.sort((a, b) => b.lastModified - a.lastModified));
      } else {
        setDocs([]);
      }
    });
  }, [user]);

  const createNewDoc = async () => {
    if (!user) return;
    const id = nanoid(10);
    const timestamp = Date.now();
    const sheetNumber = docs.length + 1;
    await set(ref(db, `documentMetadata/${id}`), {
      title: `Untitled Spreadsheet ${sheetNumber}`,
      lastModified: timestamp,
      ownerName: user.displayName || "Anonymous",
      ownerEmail: user.email || "",
    });
    router.push(`/sheet/${id}`);
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spreadsheet? This cannot be undone.")) return;
    await set(ref(db, `documentMetadata/${id}`), null);
    await set(ref(db, `sheets/${id}`), null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "signup") signUp(email, password, name);
    else if (view === "login") login(email, password);
    else resetPassword(email);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-medium lowercase tracking-tighter italic">Loading workspace...</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 md:p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl md:rounded-4xl shadow-2xl border border-slate-100 p-6 md:p-10">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">CollabrativeSheets</h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base font-medium italic">Collaborative spreadsheets for modern teams</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 text-slate-900">
            {view === "signup" && (
              <div>
                <label className="text-sm font-bold ml-1">Full Name</label>
                <input type="text" placeholder="John Doe" required className="w-full mt-1 p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm font-bold ml-1">Email Address</label>
              <input type="email" placeholder="name@company.com" required className="w-full mt-1 p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" onChange={(e) => setEmail(e.target.value)} />
            </div>
            
            {view !== "forgot" && (
              <div>
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-bold">Password</label>
                  {view === "login" && (
                    <button 
                      type="button" 
                      onClick={() => setView("forgot")}
                      className="text-[10px] md:text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    required 
                    className="w-full p-3 md:p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition pr-12" 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-bold">{error}</div>}
            {message && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-lg font-bold">{message}</div>}
            
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-3.5 md:py-4 rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]">
              {view === "login" ? "Sign In" : view === "signup" ? "Create Free Account" : "Send Reset Link"}
            </button>
          </form>
          
          <div className="mt-6 md:mt-8 text-center space-y-3">
            <button onClick={() => setView(view === "login" ? "signup" : "login")} className="block w-full text-sm font-bold text-slate-500 hover:text-blue-600 transition underline underline-offset-4 decoration-2">
              {view === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            {view === "forgot" && (
              <button onClick={() => setView("login")} className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
                ← Back to Login
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-12 py-4 md:py-7 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4 group cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-xl md:text-2xl italic shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
              S
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 hidden sm:block">
              Collaborative<span className="text-blue-600">Sheets</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="items-center gap-2 md:gap-3 pr-4 md:pr-8 border-r border-slate-100 flex">
              <div className="text-right hidden xs:block">
                <p className="text-sm md:text-md font-black text-slate-900 leading-none lowercase tracking-tighter">{user.displayName}</p>
                <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{user.email}</p>
              </div>
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-bold text-base md:text-lg">
                {user.displayName?.charAt(0)}
              </div>
            </div>
            <button onClick={logout} className="px-3 md:px-6 py-2 md:py-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black transition-all active:scale-95">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-12">
          <div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900">Documents Dashboard</h2>
            <p className="text-slate-400 md:text-slate-500 mt-1 text-sm md:text-base font-bold italic">Manage and collaborate on your spreadsheets in real-time.</p>
          </div>
          <button 
            onClick={createNewDoc} 
            className="w-full md:w-auto bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-base md:text-lg"
          >
            <span className="text-xl md:text-2xl leading-none">+</span> New Spreadsheet
          </button>
        </div>

        {docs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {docs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => router.push(`/sheet/${doc.id}`)}
                className="group relative bg-white rounded-3xl md:rounded-4xl border border-slate-100 p-6 md:p-8 shadow-2xl shadow-slate-200/40 hover:shadow-blue-200/50 hover:-translate-y-1 md:hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 md:h-2 bg-blue-600 shadow-sm" />
                <div className="flex justify-between items-start mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all md:opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
                <div className="mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter mb-1 group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Modified {new Date(doc.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="pt-4 md:pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-xl ring-2 md:ring-4 ring-white">
                      {(doc.ownerName || "A").charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] font-black text-slate-400 leading-none uppercase tracking-widest">Last Edited By</span>
                      <span className="text-xs md:text-sm font-black text-slate-700 lowercase tracking-tighter">{doc.ownerName || "Anonymous"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 md:py-24 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-3xl md:rounded-4xl border-4 border-dashed border-slate-200">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-3xl md:rounded-4xl shadow-2xl flex items-center justify-center text-slate-200 mb-6 md:mb-8 ring-4 md:ring-8 ring-white">
              <svg className="w-8 h-8 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">No documents yet</h3>
            <p className="text-slate-400 md:text-slate-500 mt-2 text-sm md:text-base font-bold italic">Start by creating your first collaborative spreadsheet to see it here.</p>
            <button onClick={createNewDoc} className="mt-8 md:mt-10 text-blue-600 font-black hover:underline decoration-2 md:decoration-4 underline-offset-4 md:underline-offset-8">Create your first sheet →</button>
          </div>
        )}
      </div>
    </main>
  );
}