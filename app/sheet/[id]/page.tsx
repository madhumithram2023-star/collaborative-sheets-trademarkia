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
    <div className="p-3 md:p-6 bg-slate-50 min-h-screen text-slate-900 flex flex-col font-sans">
      {/* UPDATED PROFESSIONAL HEADER - Responsive padding and gap */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <div 
            className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-xl md:text-2xl italic cursor-pointer shadow-lg shadow-blue-100 transition-transform active:scale-90"
            onClick={() => router.push('/')}
          >
            S
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 md:gap-3">
                <input
                className="text-xl md:text-2xl font-black bg-transparent outline-none border-b-2 border-transparent focus:border-blue-600 px-1 transition-colors w-full md:w-auto"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                />
                <button
                onClick={() => updateTitle(title)}
                className="h-7 md:h-8 px-3 md:px-4 bg-emerald-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95"
                >
                Save
                </button>
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Live Document</span>
          </div>
        </div>

        {/* PRESENCE AVATARS - Adjusted spacing for mobile */}
        <div className="flex items-center gap-4 md:gap-6 self-end md:self-auto">
          <div className="flex -space-x-2 md:-space-x-3">
            {Object.values(presence).map((p) => (
              <div
                key={p.uid}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 md:border-4 border-white flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-md ring-1 ring-slate-100 transition-transform hover:-translate-y-1"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNIFIED TOOLBAR - Added flex-wrap for mobile buttons */}
      <div className="flex flex-wrap items-center justify-between p-2 md:p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 md:mb-6 sticky top-0 z-40 gap-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-50">
            <button 
              onClick={() => activeCell && toggleStyle(activeCell, 'bold')}
              className={`h-9 md:h-10 w-10 md:w-11 flex items-center justify-center rounded-lg transition-all font-black text-sm ${
                cells[activeCell || ""]?.style?.bold 
                  ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              B
            </button>
            <button 
              onClick={() => activeCell && toggleStyle(activeCell, 'italic')}
              className={`h-9 md:h-10 w-10 md:w-11 flex items-center justify-center rounded-md transition-all italic font-serif text-lg ${
                cells[activeCell || ""]?.style?.italic 
                  ? 'bg-white shadow-md text-blue-600 ring-1 ring-slate-200' 
                  : 'text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              I
            </button>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setRowCount(prev => prev + 50)}
              className="h-9 md:h-10 px-3 md:px-6 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold text-[10px] md:text-xs hover:bg-white transition-all active:scale-95"
            >
              + 50 Rows
            </button>

            <button
              onClick={exportToCSV}
              className="h-9 md:h-10 px-3 md:px-6 bg-blue-600 text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* DISCRETE SYNC STATUS - Responsive text size */}
        <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest md:tracking-[0.2em] px-2 md:px-4 ml-auto">
            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            {saving ? 'Saving...' : 'Always Synced'}
        </div>
      </div>

      {/* GRID CONTAINER - Mobile responsive rounding */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl md:rounded-3xl shadow-inner bg-white">
        <table className="border-separate border-spacing-0 min-w-max text-sm">
          <thead className="sticky top-0 z-30 bg-slate-50">
            <tr>
              <th className="border-b border-r border-slate-200 w-10 md:w-14 h-8 md:h-10 sticky left-0 z-40 bg-slate-50"></th>
              {COLS.map((col) => (
                <th key={col} className="border-b border-r border-slate-200 p-1 md:p-2 font-mono w-28 md:w-40 text-slate-400 text-[10px] md:text-xs font-bold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row}>
                <td className="border-b border-r border-slate-200 text-center font-mono sticky left-0 z-10 w-10 md:w-14 bg-slate-50 text-slate-400 text-[9px] md:text-[10px] font-bold">{row}</td>
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