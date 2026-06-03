import { useState, useEffect } from 'react';
import { Contact } from '../types';

const STORAGE_KEY = 'voicetask_contacts';

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-]/g, '');
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }, [contacts]);

  const addContact = (name: string, phone: string): Contact => {
    const contact: Contact = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: normalizePhone(phone),
    };
    setContacts(prev => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name, 'he')));
    return contact;
  };

  const updateContact = (id: string, updates: Partial<Pick<Contact, 'name' | 'phone'>>) => {
    setContacts(prev =>
      prev
        .map(c =>
          c.id === id
            ? { ...c, ...updates, phone: updates.phone ? normalizePhone(updates.phone) : c.phone }
            : c
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'he'))
    );
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  return { contacts, addContact, updateContact, deleteContact };
}
