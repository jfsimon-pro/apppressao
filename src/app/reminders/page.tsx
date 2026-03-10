'use client';

import styles from './reminders.module.css';
import { useState, useEffect } from 'react';
import { Sun, Moon, Droplets, Pill, Plus, Activity, Trash2, Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { useLanguage } from '@/lib/LanguageContext';

interface Reminder {
    id: number;
    type: string;
    label: string;
    active: boolean;
    time: string | null;
    interval_hours: number | null;
}

function iconFor(type: string) {
    if (type === 'bp_morning') return <Sun size={22} color="var(--primary)" />;
    if (type === 'bp_night') return <Moon size={22} color="var(--primary)" />;
    if (type === 'bp') return <Activity size={22} color="var(--primary)" />;
    if (type === 'water') return <Droplets size={22} color="#3B82F6" />;
    if (type === 'medication') return <Pill size={22} color="#EF4444" />;
    return <Activity size={22} color="var(--muted)" />;
}

const defaultForm = { type: '' as '' | 'bp' | 'medication' | 'water', label: '', time: '', interval: '2' };

export default function RemindersPage() {
    const { t } = useLanguage();
    const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTime, setEditTime] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [form, setForm] = useState({ ...defaultForm });
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    function load() {
        fetch('/api/reminders')
            .then((r) => r.json())
            .then((d) => setReminders(d.reminders ?? []));
    }

    function descriptionFor(r: Reminder): string {
        if (r.interval_hours) return t.reminders.everyHour(r.interval_hours);
        if (r.time) return t.reminders.everyday(r.time);
        return t.reminders.noTime;
    }

    async function toggle(r: Reminder) {
        setReminders((prev) => prev.map((x) => x.id === r.id ? { ...x, active: !x.active } : x));
        await fetch(`/api/reminders/${r.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !r.active }),
        });
    }

    function startEdit(r: Reminder) {
        setEditingId(r.id);
        setEditTime(r.time ?? '');
    }

    async function saveTime(r: Reminder) {
        setEditingId(null);
        if (!editTime || editTime === r.time) return;
        setReminders((prev) => prev.map((x) => x.id === r.id ? { ...x, time: editTime } : x));
        await fetch(`/api/reminders/${r.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: editTime }),
        });
    }

    async function deleteReminder(id: number) {
        setReminders((prev) => prev.filter((x) => x.id !== id));
        await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    }

    function closeForm() {
        setShowAddForm(false);
        setForm({ ...defaultForm });
    }

    async function addReminder() {
        if (!form.type) return;
        if (form.type !== 'water' && !form.time) return;

        const label =
            form.type === 'bp' ? (form.label.trim() || 'Medir Pressão') :
            form.type === 'medication' ? (form.label.trim() || 'Medicamento') :
            'Beber Água';

        setSaving(true);
        const res = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: form.type,
                label,
                time: form.type !== 'water' ? form.time : null,
                interval_hours: form.type === 'water' ? Number(form.interval) : null,
            }),
        });
        const data = await res.json();
        if (data.reminder) {
            setReminders((prev) => [...prev, data.reminder]);
        }
        closeForm();
        setSaving(false);
    }

    const fixedTypes = new Set(['bp_morning', 'bp_night']);
    const bpReminders = reminders.filter((r) => r.type === 'bp_morning' || r.type === 'bp_night' || r.type === 'bp');
    const waterReminders = reminders.filter((r) => r.type === 'water');
    const medReminders = reminders.filter((r) => r.type === 'medication');

    function ReminderRow({ r }: { r: Reminder }) {
        const isEditing = editingId === r.id;
        const canDelete = !fixedTypes.has(r.type);
        return (
            <div className={styles.reminderItem}>
                <div className={styles.info}>
                    <span className={styles.icon}>{iconFor(r.type)}</span>
                    <div className={styles.infoText}>
                        <strong>{r.label}</strong>
                        {isEditing ? (
                            <div className={styles.inlineEdit}>
                                <input
                                    type="time"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    autoFocus
                                />
                                <button className={styles.saveTimeBtn} onClick={() => saveTime(r)}>OK</button>
                                <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>✕</button>
                            </div>
                        ) : (
                            <p
                                className={r.interval_hours ? '' : styles.editableTime}
                                onClick={() => !r.interval_hours && startEdit(r)}
                            >
                                {descriptionFor(r)}
                                {!r.interval_hours && <span className={styles.editHint}> ✎</span>}
                            </p>
                        )}
                    </div>
                </div>
                <div className={styles.actions}>
                    {canDelete && (
                        <button className={styles.deleteBtn} onClick={() => deleteReminder(r.id)}>
                            <Trash2 size={16} />
                        </button>
                    )}
                    <label className={styles.switch}>
                        <input type="checkbox" checked={r.active} onChange={() => toggle(r)} />
                        <span className={styles.slider}></span>
                    </label>
                </div>
            </div>
        );
    }

    function ReminderSection({ title, list }: { title: string; list: Reminder[] }) {
        if (list.length === 0) return null;
        return (
            <section className={styles.category}>
                <h2>{title}</h2>
                <div className={styles.card}>
                    {list.map((r, i) => (
                        <div key={r.id}>
                            <ReminderRow r={r} />
                            {i < list.length - 1 && <div className={styles.divider} />}
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>{t.reminders.title}</h1>
                <p>{t.reminders.subtitle}</p>
            </header>

            <main className={styles.main}>
                {permission === 'unsupported' ? null : permission === 'denied' ? (
                    <div className={styles.notifBanner} data-state="denied">
                        <BellOff size={20} />
                        <div>
                            <strong>{t.reminders.notifDeniedTitle}</strong>
                            <p>{t.reminders.notifDeniedDesc}</p>
                        </div>
                    </div>
                ) : subscribed ? (
                    <div className={styles.notifBanner} data-state="active">
                        <Bell size={20} />
                        <div className={styles.notifText}>
                            <strong>{t.reminders.notifActiveTitle}</strong>
                            <p>{t.reminders.notifActiveDesc}</p>
                        </div>
                        <button className={styles.notifAction} onClick={unsubscribe} disabled={pushLoading}>
                            {pushLoading ? '...' : t.reminders.notifDeactivate}
                        </button>
                    </div>
                ) : (
                    <div className={styles.notifBanner} data-state="idle">
                        <Bell size={20} />
                        <div className={styles.notifText}>
                            <strong>{t.reminders.notifIdleTitle}</strong>
                            <p>{t.reminders.notifIdleDesc}</p>
                        </div>
                        <button className={styles.notifAction} onClick={subscribe} disabled={pushLoading}>
                            {pushLoading ? '...' : t.reminders.notifActivate}
                        </button>
                    </div>
                )}

                {reminders.length === 0 && !showAddForm && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{t.reminders.loading}</p>
                )}

                <ReminderSection title={t.reminders.sectionBP} list={bpReminders} />
                <ReminderSection title={t.reminders.sectionMeds} list={medReminders} />
                <ReminderSection title={t.reminders.sectionWater} list={waterReminders} />

                {showAddForm ? (
                    <div className={styles.addForm}>
                        <h3>{t.reminders.addTitle}</h3>

                        <div className={styles.typePicker}>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'bp' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'bp' }))}
                            >
                                <Activity size={20} />
                                {t.reminders.typeBP}
                            </button>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'medication' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'medication' }))}
                            >
                                <Pill size={20} />
                                {t.reminders.typeMed}
                            </button>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'water' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'water' }))}
                            >
                                <Droplets size={20} />
                                {t.reminders.typeWater}
                            </button>
                        </div>

                        {form.type === 'bp' && (
                            <div className={styles.addFormFields}>
                                <input
                                    type="text"
                                    placeholder={t.reminders.bpNamePlaceholder}
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                    autoFocus
                                />
                                <label className={styles.fieldLabel}>{t.reminders.timeLabel}</label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                />
                            </div>
                        )}

                        {form.type === 'medication' && (
                            <div className={styles.addFormFields}>
                                <input
                                    type="text"
                                    placeholder={t.reminders.medNamePlaceholder}
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                    autoFocus
                                />
                                <label className={styles.fieldLabel}>{t.reminders.doseLabel}</label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                />
                            </div>
                        )}

                        {form.type === 'water' && (
                            <div className={styles.addFormFields}>
                                <label className={styles.fieldLabel}>{t.reminders.intervalLabel}</label>
                                <select
                                    value={form.interval}
                                    onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
                                    className={styles.selectField}
                                >
                                    {[1, 2, 3, 4, 6, 8].map((h) => (
                                        <option key={h} value={String(h)}>{t.reminders.hours(h)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.addFormActions}>
                            <button className={styles.cancelFormBtn} onClick={closeForm}>{t.reminders.cancel}</button>
                            <button
                                className={styles.confirmAddBtn}
                                onClick={addReminder}
                                disabled={saving || !form.type || (form.type !== 'water' && !form.time)}
                            >
                                {saving ? t.reminders.adding : t.reminders.add}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button className={styles.addButton} onClick={() => setShowAddForm(true)}>
                        <Plus size={20} /> {t.reminders.addButton}
                    </button>
                )}
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
