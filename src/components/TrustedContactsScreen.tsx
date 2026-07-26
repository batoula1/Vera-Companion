import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone, 
  Mail, 
  Trash2, 
  Edit3, 
  Star, 
  Check, 
  X, 
  ShieldCheck, 
  ArrowLeft,
  Search,
  AlertCircle
} from 'lucide-react';
import { TrustedContact } from '../types';
import { db, collection, addDoc, updateDoc, setDoc, deleteDoc, doc, getDocs, query, where } from '../lib/firebase';

interface TrustedContactsScreenProps {
  userId: string;
  contacts: TrustedContact[];
  onContactsChange: (updated: TrustedContact[]) => void;
  onBack: () => void;
}

export const TrustedContactsScreen: React.FC<TrustedContactsScreenProps> = ({
  userId,
  contacts,
  onContactsChange,
  onBack
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRelationship('Parent');
    setPhone('');
    setEmail('');
    setIsPrimary(false);
    setEditingContact(null);
    setShowAddModal(false);
    setError(null);
  };

  const openEditModal = (contact: TrustedContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setRelationship(contact.relationship);
    setPhone(contact.phone);
    setEmail(contact.email || '');
    setIsPrimary(contact.isPrimary || false);
    setShowAddModal(true);
  };

  const refreshFromFirestore = async () => {
    if (!userId || userId.startsWith('demo-')) return;
    try {
      let q = query(collection(db, 'trusted_contacts'), where('userId', '==', userId));
      let querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        q = query(collection(db, 'trustedContacts'), where('userId', '==', userId));
        querySnap = await getDocs(q);
      }

      const list: TrustedContact[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId || userId,
          name: data.name || '',
          relationship: data.relationship || '',
          phone: data.phone || '',
          email: data.email || '',
          isPrimary: !!data.isPrimary,
          createdAt: data.createdAt
        });
      });

      if (list.length > 0) {
        onContactsChange(list);
      }
    } catch (err) {
      console.warn('Error refreshing contacts from Firestore:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide a contact name and phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isRealUser = Boolean(userId && !userId.startsWith('demo-'));

      if (editingContact) {
        // Update existing contact
        const isDefaultContact = editingContact.id.startsWith('default-') || editingContact.id.startsWith('contact-');
        let targetId = editingContact.id;

        const payload = {
          userId,
          name: name.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          isPrimary,
          updatedAt: new Date().toISOString()
        };

        if (isRealUser) {
          if (isDefaultContact) {
            // Save as a new document in Firestore for this user
            const createPayload = {
              ...payload,
              createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'trusted_contacts'), createPayload);
            targetId = docRef.id;
            try {
              await setDoc(doc(db, 'trustedContacts', targetId), createPayload);
            } catch (e) {}
          } else {
            // Update existing Firestore document
            await setDoc(doc(db, 'trusted_contacts', targetId), payload, { merge: true });
            try {
              await setDoc(doc(db, 'trustedContacts', targetId), payload, { merge: true });
            } catch (e) {}
          }

          // If set as primary, unmark other contacts
          if (isPrimary) {
            for (const c of contacts) {
              if (c.id !== editingContact.id && c.isPrimary && !c.id.startsWith('default-') && !c.id.startsWith('contact-')) {
                try {
                  await setDoc(doc(db, 'trusted_contacts', c.id), { isPrimary: false }, { merge: true });
                  await setDoc(doc(db, 'trustedContacts', c.id), { isPrimary: false }, { merge: true });
                } catch (e) {}
              }
            }
          }
        }

        const updatedContact: TrustedContact = {
          id: targetId,
          userId,
          name: name.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          isPrimary,
          createdAt: editingContact.createdAt || new Date().toISOString()
        };

        const updatedList = contacts.map(c => 
          c.id === editingContact.id 
            ? updatedContact 
            : (isPrimary ? { ...c, isPrimary: false } : c)
        );

        onContactsChange(updatedList);

        if (isRealUser) {
          await refreshFromFirestore();
        }
      } else {
        // Create new contact
        const newTempId = 'contact-' + Date.now();
        const payload = {
          userId,
          name: name.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          isPrimary,
          createdAt: new Date().toISOString()
        };

        let dbId = newTempId;
        if (isRealUser) {
          const docRef = await addDoc(collection(db, 'trusted_contacts'), payload);
          dbId = docRef.id;
          try {
            await setDoc(doc(db, 'trustedContacts', dbId), payload);
          } catch (e) {}

          if (isPrimary) {
            for (const c of contacts) {
              if (c.isPrimary && !c.id.startsWith('default-') && !c.id.startsWith('contact-')) {
                try {
                  await setDoc(doc(db, 'trusted_contacts', c.id), { isPrimary: false }, { merge: true });
                  await setDoc(doc(db, 'trustedContacts', c.id), { isPrimary: false }, { merge: true });
                } catch (e) {}
              }
            }
          }
        }

        const newContact: TrustedContact = {
          id: dbId,
          userId,
          name: name.trim(),
          relationship,
          phone: phone.trim(),
          email: email.trim(),
          isPrimary,
          createdAt: payload.createdAt
        };

        const updatedList = isPrimary 
          ? [newContact, ...contacts.map(c => ({ ...c, isPrimary: false }))]
          : [...contacts, newContact];

        onContactsChange(updatedList);

        if (isRealUser) {
          await refreshFromFirestore();
        }
      }

      resetForm();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact to database.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;

    const updatedList = contacts.filter(c => c.id !== contactId);
    onContactsChange(updatedList);

    try {
      if (userId && !userId.startsWith('demo-')) {
        try {
          await deleteDoc(doc(db, 'trusted_contacts', contactId));
        } catch (e) {}
        try {
          await deleteDoc(doc(db, 'trustedContacts', contactId));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Delete firestore contact error:', err);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 pb-24">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-900 text-white pt-6 pb-8 px-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            id="contacts-back-btn"
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
            <Users className="w-3.5 h-3.5 text-violet-300" />
            <span>{contacts.length} Guardians</span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">Trusted Contacts</h1>
        <p className="text-violet-200/80 text-xs mt-1">
          These emergency contacts receive instant SMS & AI dispatch reports when SOS is triggered.
        </p>
      </div>

      {/* Main Contact List Content */}
      <div className="p-5 max-w-xl mx-auto space-y-4 -mt-3">
        {/* Add Contact Button */}
        <button
          type="button"
          id="contacts-add-new-btn"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 transition text-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Emergency Contact</span>
        </button>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Trusted Contacts Added Yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add family, friends, or trusted guardians who should be notified when you need help.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm ${
                    contact.isPrimary 
                      ? 'bg-gradient-to-tr from-violet-600 to-indigo-600' 
                      : 'bg-slate-700'
                  }`}>
                    {contact.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {contact.name}
                      </h4>
                      {contact.isPrimary && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-violet-700" /> Primary
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-500 font-medium">
                      {contact.relationship}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-violet-600" /> {contact.phone}
                      </span>
                      {contact.email && (
                        <span className="hidden sm:flex items-center gap-1 truncate text-slate-400">
                          <Mail className="w-3 h-3 text-violet-400" /> {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    id={`contacts-edit-btn-${contact.id}`}
                    onClick={() => openEditModal(contact)}
                    title="Edit Contact"
                    className="p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    id={`contacts-delete-btn-${contact.id}`}
                    onClick={() => handleDelete(contact.id)}
                    title="Delete Contact"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingContact ? 'Edit Trusted Contact' : 'Add Emergency Contact'}
              </h3>
              <button
                type="button"
                id="contacts-modal-close-btn"
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  id="contacts-modal-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marcus Chen"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    id="contacts-modal-relationship-select"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                  >
                    <option value="Parent">Parent</option>
                    <option value="Partner">Partner / Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Close Friend</option>
                    <option value="Neighbor">Neighbor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    id="contacts-modal-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 555-0199"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  id="contacts-modal-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcus@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="contacts-modal-isprimary-checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
                <label htmlFor="contacts-modal-isprimary-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Set as Primary First Responder
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  id="contacts-modal-cancel-btn"
                  onClick={resetForm}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  id="contacts-modal-submit-btn"
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  {loading ? 'Saving...' : editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
