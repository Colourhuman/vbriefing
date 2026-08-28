import React, { useState } from 'react';
import { LayoutDashboard, FileText, Map, Settings } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center font-bold text-slate-950">
            m
          </div>
          <h1 className="text-xl font-bold text-sky-400">mBriefing EFB</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('briefing')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'briefing' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <FileText size={20} />
            OFP / Briefing
          </button>

          <button 
            onClick={() => setActiveTab('map')} 
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${activeTab === 'map' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Map size={20} />
            Enroute Map
          </button>
        </nav>
      </aside>

      {/* Hauptbereich */}
      <main className="flex-1 p-8 overflow-y-auto bg-slate-900">
        {activeTab === 'dashboard' && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Flight Dashboard</h2>
            <p className="text-slate-300">Das Dashboard ist geladen und betriebsbereit!</p>
          </div>
        )}

        {activeTab === 'briefing' && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">OFP Briefing</h2>
            <p className="text-slate-300">Hier binden wir gleich den SimBrief XML Fetcher ein.</p>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-sky-400 mb-2">Enroute Map</h2>
            <p className="text-slate-300">Karten-Vorschau aktiv.</p>
          </div>
        )}
      </main>
    </div>
  );
}
