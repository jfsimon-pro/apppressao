'use client';

import styles from './reminders.module.css';
import { useState, useEffect } from 'react';
import { Sun, Moon, Droplets, Pill, Plus, Activity, Trash2, Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/lib/usePushNotifications';

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

function descriptionFor(r: Reminder): string {
    if (r.interval_hours) return `A cada ${r.interval_hours} hora${r.interval_hours > 1 ? 's' : ''}`;
    if (r.time) return `Todos os dias às ${r.time}`;
    return 'Sem horário definido';
}

const defaultForm = { type: '' as '' | 'bp' | 'medication' | 'water', label: '', time: '', interval: '2' };

export default function RemindersPage() {
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

    // Fixed defaults can't be deleted; user-added reminders can
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
                <h1>Lembretes</h1>
                <p>Mantenha sua rotina em dia</p>
            </header>

            <main className={styles.main}>
                {/* Push notification banner */}
                {permission === 'unsupported' ? null : permission === 'denied' ? (
                    <div className={styles.notifBanner} data-state="denied">
                        <BellOff size={20} />
                        <div>
                            <strong>Notificações bloqueadas</strong>
                            <p>Habilite nas configurações do navegador para receber lembretes.</p>
                        </div>
                    </div>
                ) : subscribed ? (
                    <div className={styles.notifBanner} data-state="active">
                        <Bell size={20} />
                        <div className={styles.notifText}>
                            <strong>Notificações ativas</strong>
                            <p>Você receberá alertas nos horários configurados.</p>
                        </div>
                        <button className={styles.notifAction} onClick={unsubscribe} disabled={pushLoading}>
                            {pushLoading ? '...' : 'Desativar'}
                        </button>
                    </div>
                ) : (
                    <div className={styles.notifBanner} data-state="idle">
                        <Bell size={20} />
                        <div className={styles.notifText}>
                            <strong>Ativar notificações</strong>
                            <p>Receba alertas dos seus lembretes em tempo real.</p>
                        </div>
                        <button className={styles.notifAction} onClick={subscribe} disabled={pushLoading}>
                            {pushLoading ? '...' : 'Ativar'}
                        </button>
                    </div>
                )}

                {reminders.length === 0 && !showAddForm && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Carregando...</p>
                )}

                <ReminderSection title="Pressão Arterial" list={bpReminders} />
                <ReminderSection title="Medicamentos" list={medReminders} />
                <ReminderSection title="Beber Água" list={waterReminders} />

                {showAddForm ? (
                    <div className={styles.addForm}>
                        <h3>Novo Lembrete</h3>

                        {/* Type picker */}
                        <div className={styles.typePicker}>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'bp' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'bp' }))}
                            >
                                <Activity size={20} />
                                Pressão
                            </button>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'medication' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'medication' }))}
                            >
                                <Pill size={20} />
                                Medicamento
                            </button>
                            <button
                                className={`${styles.typeBtn} ${form.type === 'water' ? styles.typeBtnActive : ''}`}
                                onClick={() => setForm((f) => ({ ...f, type: 'water' }))}
                            >
                                <Droplets size={20} />
                                Água
                            </button>
                        </div>

                        {/* Fields for BP */}
                        {form.type === 'bp' && (
                            <div className={styles.addFormFields}>
                                <input
                                    type="text"
                                    placeholder="Nome (ex: Após almoço)"
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                    autoFocus
                                />
                                <label className={styles.fieldLabel}>Horário</label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* Fields for Medication */}
                        {form.type === 'medication' && (
                            <div className={styles.addFormFields}>
                                <input
                                    type="text"
                                    placeholder="Nome do medicamento"
                                    value={form.label}
                                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                    autoFocus
                                />
                                <label className={styles.fieldLabel}>Horário da dose</label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* Fields for Water */}
                        {form.type === 'water' && (
                            <div className={styles.addFormFields}>
                                <label className={styles.fieldLabel}>Lembrar a cada</label>
                                <select
                                    value={form.interval}
                                    onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
                                    className={styles.selectField}
                                >
                                    <option value="1">1 hora</option>
                                    <option value="2">2 horas</option>
                                    <option value="3">3 horas</option>
                                    <option value="4">4 horas</option>
                                    <option value="6">6 horas</option>
                                    <option value="8">8 horas</option>
                                </select>
                            </div>
                        )}

                        <div className={styles.addFormActions}>
                            <button className={styles.cancelFormBtn} onClick={closeForm}>Cancelar</button>
                            <button
                                className={styles.confirmAddBtn}
                                onClick={addReminder}
                                disabled={saving || !form.type || (form.type !== 'water' && !form.time)}
                            >
                                {saving ? 'Salvando...' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button className={styles.addButton} onClick={() => setShowAddForm(true)}>
                        <Plus size={20} /> Adicionar Lembrete
                    </button>
                )}
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
