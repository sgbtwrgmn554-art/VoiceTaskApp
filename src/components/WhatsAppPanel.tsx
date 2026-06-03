import React, { useState } from 'react';
import { Contact, WhatsAppScheduledMessage } from '../types';
import { ContactsManager } from './ContactsManager';

interface WhatsAppPanelProps {
  contacts: Contact[];
  messages: WhatsAppScheduledMessage[];
  onAddContact: (name: string, phone: string) => void;
  onUpdateContact: (id: string, updates: Partial<Pick<Contact, 'name' | 'phone'>>) => void;
  onDeleteContact: (id: string) => void;
  onSchedule: (data: Omit<WhatsAppScheduledMessage, 'id' | 'status' | 'createdAt'>) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_LABELS: Record<WhatsAppScheduledMessage['status'], { label: string; color: string }> = {
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'נשלח', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'בוטל', color: 'bg-gray-100 text-gray-500' },
};

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}`);
  return d.toLocaleString('he-IL', {
    day: 'numeric', month: 'numeric', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function WhatsAppPanel({
  contacts,
  messages,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSchedule,
  onCancel,
  onDelete,
}: WhatsAppPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [contactId, setContactId] = useState('');
  const [message, setMessage] = useState('');
  const [schedDate, setSchedDate] = useState(today);
  const [schedTime, setSchedTime] = useState(defaultTime);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');

  const selectedContact = contacts.find(c => c.id === contactId);

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !message.trim() || !schedDate || !schedTime) return;
    if (!selectedContact) return;

    onSchedule({
      contactId,
      contactName: selectedContact.name,
      phone: selectedContact.phone,
      message: message.trim(),
      scheduledDate: schedDate,
      scheduledTime: schedTime,
    });

    setMessage('');
    setContactId('');
    setSchedDate(today);
    setSchedTime(defaultTime);
    setShowForm(false);
  };

  const pending = messages.filter(m => m.status === 'pending');
  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-sm shadow-green-200">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">WhatsApp</h2>
              <p className="text-xs text-gray-400">
                {pending.length > 0 ? `${pending.length} הודעות ממתינות` : 'אין הודעות ממתינות'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-green-200 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הודעה חדשה
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Schedule form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between">
              <span className="font-semibold text-green-800 text-sm">תזמן הודעת WhatsApp</span>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSchedule} className="p-4 space-y-3">
              {/* Contact select */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">איש קשר</label>
                {contacts.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    הוסיפי קודם אנשי קשר בחלק למטה
                  </p>
                ) : (
                  <select
                    value={contactId}
                    onChange={e => setContactId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    required
                  >
                    <option value="">בחרי איש קשר…</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.phone}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">הודעה</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="כתבי את ההודעה כאן…"
                  rows={3}
                  required
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
                  <input
                    type="date"
                    value={schedDate}
                    min={today}
                    onChange={e => setSchedDate(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">שעה</label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                  />
                </div>
              </div>

              {contactId && message && schedDate && schedTime && (
                <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700">
                  <p className="font-medium">סיכום:</p>
                  <p>נשלח ל-<strong>{selectedContact?.name}</strong> ב-{formatDateTime(schedDate, schedTime)}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!contactId || !message.trim() || contacts.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                תזמן שליחה
              </button>
            </form>
          </div>
        )}

        {/* Contacts manager */}
        <ContactsManager
          contacts={contacts}
          onAdd={onAddContact}
          onUpdate={onUpdateContact}
          onDelete={onDeleteContact}
        />

        {/* Scheduled messages list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">הודעות מתוזמנות</span>
            <div className="flex gap-1">
              {(['all', 'pending', 'sent'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                    filter === f ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתינות' : 'נשלחו'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400">אין הודעות להצגה</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered
                .slice()
                .sort((a, b) => {
                  if (a.status === 'pending' && b.status !== 'pending') return -1;
                  if (a.status !== 'pending' && b.status === 'pending') return 1;
                  return `${a.scheduledDate}T${a.scheduledTime}` < `${b.scheduledDate}T${b.scheduledTime}` ? -1 : 1;
                })
                .map(msg => {
                  const s = STATUS_LABELS[msg.status];
                  return (
                    <li key={msg.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                            {msg.contactName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-800">{msg.contactName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                                {s.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDateTime(msg.scheduledDate, msg.scheduledTime)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.message}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {msg.status === 'pending' && (
                            <button
                              onClick={() => onCancel(msg.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                              title="בטל"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(msg.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="מחק"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
