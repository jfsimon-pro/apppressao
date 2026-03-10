'use client';

import styles from './settings.module.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import type { Locale } from '@/lib/i18n';

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
    { code: 'pt', flag: '🇧🇷', label: 'Português' },
    { code: 'en', flag: '🇺🇸', label: 'English' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
];

export default function SettingsPage() {
    const { t, locale, setLocale } = useLanguage();
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
                setMessage({ type: 'success', text: t.settings.saveSuccess });
            } else {
                setMessage({ type: 'error', text: data.error ?? t.settings.saveError });
            }
        } catch {
            setMessage({ type: 'error', text: t.settings.connectionError });
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
                <h1>{t.settings.title}</h1>
                <p>{t.settings.subtitle}</p>
            </header>

            <main className={styles.main}>
                {/* Personal Data Section */}
                <section className={styles.section}>
                    <h2>{t.settings.personalData}</h2>
                    <div className={styles.card}>
                        {loading ? (
                            <p style={{ color: 'var(--muted)' }}>{t.settings.loading}</p>
                        ) : (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>{t.settings.fullName}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>{t.settings.email}</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>{t.settings.phone}</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder={t.settings.phonePlaceholder}
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
                                    {saving ? t.settings.saving : t.settings.saveButton}
                                </button>
                            </>
                        )}
                    </div>
                </section>

                {/* Preferences Section */}
                <section className={styles.section}>
                    <h2>{t.settings.preferences}</h2>
                    <div className={styles.card}>
                        <div className={styles.settingItem}>
                            <div className={styles.settingInfo}>
                                <strong>{t.settings.pushNotif}</strong>
                                <p>{t.settings.pushNotifDesc}</p>
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

                        <div className={styles.settingItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div className={styles.settingInfo}>
                                <strong>{t.settings.language}</strong>
                                <p>{t.settings.languageLabel}</p>
                            </div>
                            <div className={styles.languageSelector}>
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        className={`${styles.langBtn} ${locale === lang.code ? styles.langBtnActive : ''}`}
                                        onClick={() => setLocale(lang.code)}
                                    >
                                        {lang.flag} {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <button className={styles.logoutButton} onClick={handleLogout}>
                    {t.settings.logout}
                </button>
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
