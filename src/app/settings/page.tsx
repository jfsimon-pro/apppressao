'use client';

import styles from './settings.module.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [pushEnabled, setPushEnabled] = useState(true);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetch('/api/user/profile')
            .then((res) => res.json())
            .then((data) => {
                if (data.user) {
                    setName(data.user.name ?? '');
                    setEmail(data.user.email ?? '');
                    setPhone(data.user.phone ?? '');
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
            } else {
                setMessage({ type: 'error', text: data.error ?? 'Erro ao salvar dados.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Erro de conexão.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Configurações</h1>
                <p>Gerencie sua conta e preferências</p>
            </header>

            <main className={styles.main}>
                {/* Personal Data Section */}
                <section className={styles.section}>
                    <h2>Dados Pessoais</h2>
                    <div className={styles.card}>
                        {loading ? (
                            <p style={{ color: 'var(--muted)' }}>Carregando...</p>
                        ) : (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>Nome Completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Telefone</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+55 11 99999-9999"
                                    />
                                </div>
                                {message && (
                                    <p style={{ color: message.type === 'success' ? 'var(--accent)' : 'var(--danger)', fontSize: '0.875rem' }}>
                                        {message.text}
                                    </p>
                                )}
                                <button
                                    className={styles.saveButton}
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Salvando...' : 'Atualizar Dados'}
                                </button>
                            </>
                        )}
                    </div>
                </section>

                {/* Notifications Section */}
                <section className={styles.section}>
                    <h2>Preferências</h2>
                    <div className={styles.card}>
                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <strong>Notificações Push</strong>
                                <p>Receba alertas de medição e saúde</p>
                            </div>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={pushEnabled}
                                    onChange={() => setPushEnabled(!pushEnabled)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>
                </section>

                <button className={styles.logoutButton} onClick={handleLogout}>
                    Sair da Conta
                </button>
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
