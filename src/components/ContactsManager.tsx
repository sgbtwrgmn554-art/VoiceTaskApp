import React, { useState } from 'react';
import { Contact } from '../types';

interface ContactsManagerProps {
  contacts: Contact[];
  onAdd: (name: string, phone: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Contact, 'name' | 'phone'>>) => void;
  onDelete: (id: string) => void;
}

export function ContactsManager({ contacts, onAdd, onUpdate, onDelete }: ContactsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (editingId) {
      onUpdate(editingId, { name, phone });
      setEditingId(null);
    } else {
      onAdd(name, phone);
    }
    setName('');
    setPhone('');
    setShowForm(false);
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setPhone('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-800 text-sm">אנשי קשר ({contacts.length})</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setName(''); setPhone(''); }}
          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          הוסף
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 py-3 bg-green-50 border-b border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-2">
            {editingId ? 'ערוך איש קשר' : 'איש קשר חדש'}
          </p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="שם"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              autoFocus
            />
            <input
              type="tel"
              placeholder="05X-XXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
              dir="ltr"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim() || !phone.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
            >
              {editingId ? 'שמור' : 'הוסף'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-400">עדיין אין אנשי קשר</p>
          <p className="text-xs text-gray-300 mt-1">הוסיפי אנשי קשר כדי לשלוח להם הודעות</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
          {contacts.map(c => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 dir-ltr">{c.phone}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(c)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="ערוך"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="מחק"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
