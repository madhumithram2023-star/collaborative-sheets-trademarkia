"use client";

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

import { db } from "lib/firebase"
import { ref, onValue, update, onDisconnect } from "firebase/database"

import { useAuth } from "hooks/useAuth"

import { CellData, PresenceUser } from "../../types"

import Cell from "../../components/Cell"

const COLS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export default function SpreadsheetPage() {
  const { id } = useParams(); 
  const router = useRouter(); 
  const { user, userColor } = useAuth();

  const [rowCount, setRowCount] = useState(100);
  const ROWS = Array.from({ length: rowCount }, (_, i) => i + 1);

  const [cells, setCells] = useState<Record<string, CellData>>({});
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, PresenceUser>>({});
  const [title, setTitle] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  //Presence System
  useEffect(() => {
    if (!user || !id) return;

    const userPresenceRef = ref(db, `sheets/${id}/presence/${user.uid}`);
    const allPresenceRef = ref(db, `sheets/${id}/presence`);

    const myPresence: PresenceUser = {
      uid: user.uid,
      name: user.displayName || "Anonymous",
      color: userColor,
      lastActive: Date.now()
    };

    update(userPresenceRef, myPresence);
    onDisconnect(userPresenceRef).remove();

    const unsubscribe = onValue(allPresenceRef, (snapshot) => {
      if (snapshot.exists()) setPresence(snapshot.val());
      else setPresence({});
    });

    return () => unsubscribe();
  }, [id, user, userColor]);

  
  //Real-time Sync & Logic

  useEffect(() => {
    const sheetRef = ref(db, `sheets/${id}/cells`);
    return onValue(sheetRef, (snapshot) => {
      if (snapshot.exists()) setCells(snapshot.val());
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const titleRef = ref(db, `documentMetadata/${id}/title`);
    const unsubscribe = onValue(titleRef, (snapshot) => {
      if (snapshot.exists()) setTitle(snapshot.val());
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
  if (!id) return;
  
  const docRef = ref(db, `documentMetadata/${id}`);
  const unsubscribe = onValue(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      alert("This spreadsheet has been deleted by the owner.");
      router.push("/"); 
    }
  });
  return () => unsubscribe();
}, [id, router]);

  //Formatting & Actions
  const handleCellChange = useCallback(
    async (cellId: string, newValue: string) => {
      if (!user) return;
      setSaving(true);

      update(ref(db, `sheets/${id}/presence/${user.uid}`), {
        cursor: cellId,
        typing: newValue
      });

      const timestamp = Date.now();
      const existing = cells[cellId] || {};

      await update(ref(db, `sheets/${id}/cells/${cellId}`), {
        ...existing,
        value: newValue,
        lastEditedBy: user.displayName || "Anonymous",
        updatedAt: timestamp,
      });

      setSaving(false);
    },
    [id, user, cells]
  );

  const handleFocus = useCallback(
    (cellId: string) => {
      setActiveCell(cellId);
      if (!user) return;
      update(ref(db, `sheets/${id}/presence/${user.uid}`), {
        cursor: cellId
      });
    },
    [id, user]
  );

  const toggleStyle = async (cellId: string | null, styleType: 'bold' | 'italic') => {
    if (!cellId || !id) return;
    const currentStyle = cells[cellId]?.style?.[styleType] || false;

    await update(ref(db, `sheets/${id}/cells/${cellId}/style`), {
      [styleType]: !currentStyle
    });
  };

  const updateTitle = (newTitle: string) => {
    setTitle(newTitle);
    update(ref(db, `documentMetadata/${id}`), {
      title: newTitle,
      lastModified: Date.now()
    });
  };
  
  const exportToCSV = () => {
    const cols = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    const rows = Array.from({ length: rowCount }, (_, i) => i + 1);
    
    let csvContent = "data:text/csv;charset=utf-8," + cols.join(",") + "\n";
    
    rows.forEach(row => {
      const rowData = cols.map(col => {
        const cellId = `${col}${row}`;
        const value = cells[cellId]?.value || "";
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title || "spreadsheet"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 flex flex-col font-sans">
      {/* UPDATED PROFESSIONAL HEADER WITH TITLE SAVE */}
      <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic cursor-pointer shadow-lg shadow-blue-100 transition-transform active:scale-90"
            onClick={() => router.push('/')}
          >
            S
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
                <input
                className="text-2xl font-black bg-transparent outline-none border-b-2 border-transparent focus:border-blue-600 px-1 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                />
                <button
                onClick={() => updateTitle(title)}
                className="h-8 px-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95"
                >
                Save
                </button>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Live Document</span>
          </div>
        </div>

        {/* PRESENCE AVATARS */}
        <div className="flex items-center gap-6">
          <div className="flex -space-x-3">
            {Object.values(presence).map((p) => (
              <div
                key={p.uid}
                className="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-xs font-black text-white shadow-md ring-1 ring-slate-100 transition-transform hover:-translate-y-1"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNIFIED TOOLBAR */}
      <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-50">
            <button 
              onClick={() => activeCell && toggleStyle(activeCell, 'bold')}
              className={`h-10 w-11 flex items-center justify-center rounded-lg transition-all font-black text-sm ${
                cells[activeCell || ""]?.style?.bold 
                  ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              B
            </button>
            <button 
              onClick={() => activeCell && toggleStyle(activeCell, 'italic')}
              className={`h-10 w-11 flex items-center justify-center rounded-md transition-all italic font-serif text-lg ${
                cells[activeCell || ""]?.style?.italic 
                  ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              I
            </button>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-1" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRowCount(prev => prev + 50)}
              className="h-10 px-6 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs hover:bg-white transition-all active:scale-95"
            >
              + 50 Rows
            </button>

            <button
              onClick={exportToCSV}
              className="h-10 px-6 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* DISCRETE SYNC STATUS */}
        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            {saving ? 'Saving...' : 'Always Synced'}
        </div>
      </div>

      {/* GRID */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-3xl shadow-inner bg-white">
        <table className="border-separate border-spacing-0 min-w-max text-sm">
          <thead className="sticky top-0 z-30 bg-slate-50">
            <tr>
              <th className="border-b border-r border-slate-200 w-14 h-10 sticky left-0 z-40 bg-slate-50"></th>
              {COLS.map((col) => (
                <th key={col} className="border-b border-r border-slate-200 p-2 font-mono w-40 text-slate-400 text-xs font-bold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row}>
                <td className="border-b border-r border-slate-200 text-center font-mono sticky left-0 z-10 w-14 bg-slate-50 text-slate-400 text-[10px] font-bold">{row}</td>
                {COLS.map((col) => {
                  const cellId = `${col}${row}`;
                  return (
                    <Cell
                      key={cellId}
                      id={cellId}
                      data={cells[cellId]}
                      isActive={activeCell === cellId}
                      otherUser={Object.values(presence).find(p => p.cursor === cellId && p.uid !== user?.uid)}
                      onFocus={handleFocus}
                      onBlur={() => {}} 
                      onChange={handleCellChange}
                      cells={cells}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}