'use client';

import styles from './dashboard.module.css';
import { Sun, Moon, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface Reading {
    id: number;
    systolic: number;
    diastolic: number;
    period: string;
    observation: string | null;
    measured_at: string;
}

interface CardState {
    sys: string;
    dia: string;
    time: string;
    obs: string;
}

const emptyCard = (): CardState => ({ sys: '', dia: '', time: '', obs: '' });

function buildMeasuredAt(time: string): string | undefined {
    if (!time) return undefined;
    const [h, m] = time.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
}

export default function DashboardPage() {
    const { t } = useLanguage();
    const [userName, setUserName] = useState('');
    const [initials, setInitials] = useState('');
    const [readings, setReadings] = useState<Reading[]>([]);

    const [morning, setMorning] = useState<CardState>(emptyCard());
    const [night, setNight] = useState<CardState>(emptyCard());
    const [extra, setExtra] = useState<CardState>(emptyCard());

    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetch('/api/user/profile')
            .then((r) => r.json())
            .then((d) => {
                if (d.user) {
                    setUserName(d.user.name);
                    const parts = (d.user.name as string).trim().split(' ');
                    setInitials((parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase());
                }
            });
        loadReadings();
    }, []);

    function loadReadings() {
        fetch('/api/readings')
            .then((r) => r.json())
            .then((d) => setReadings(d.readings ?? []));
    }

    async function saveReading(period: string, card: CardState) {
        if (!card.sys || !card.dia) return;
        setSaving((s) => ({ ...s, [period]: true }));
        setSaved((s) => ({ ...s, [period]: false }));

        await fetch('/api/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systolic: Number(card.sys),
                diastolic: Number(card.dia),
                period,
                observation: card.obs || null,
                measured_at: buildMeasuredAt(card.time),
            }),
        });

        setSaving((s) => ({ ...s, [period]: false }));
        setSaved((s) => ({ ...s, [period]: true }));
        loadReadings();
    }

    function getBpStatus(systolic: number, diastolic: number): { label: string; className: string } {
        if (systolic < 90 || diastolic < 60) return { label: t.bpStatus.low, className: styles.statusBaixa };
        if (systolic > 180 || diastolic > 120) return { label: t.bpStatus.crisis, className: styles.statusCrise };
        if (systolic >= 140 || diastolic >= 90) return { label: t.bpStatus.high, className: styles.statusAlta };
        if (systolic >= 130 || diastolic >= 80) return { label: t.bpStatus.elevated, className: styles.statusElevada };
        return { label: t.bpStatus.normal, className: styles.statusNormal };
    }

    function periodLabel(period: string): string {
        if (period === 'morning') return t.period.morning;
        if (period === 'night') return t.period.night;
        return t.period.extra;
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(t.locale, { day: '2-digit', month: 'short' });
    }

    function formatTime(iso: string): string {
        return new Date(iso).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
    }

    function todayFormatted(): string {
        return new Date().toLocaleDateString(t.locale, { day: '2-digit', month: 'long' });
    }

    const firstName = userName.split(' ')[0];

    function BpCard({
        period,
        icon,
        label,
        card,
        setCard,
        customBg,
    }: {
        period: string;
        icon: React.ReactNode;
        label: string;
        card: CardState;
        setCard: React.Dispatch<React.SetStateAction<CardState>>;
        customBg?: boolean;
    }) {
        return (
            <div className={customBg ? styles.cardCustom : styles.card}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardIcon}>{icon}</span>
                    <h3>{label}</h3>
                </div>
                <div className={styles.inputs}>
                    <div className={styles.inputField}>
                        <label>{t.dashboard.time}</label>
                        <input
                            type="time"
                            value={card.time}
                            onChange={(e) => setCard((p) => ({ ...p, time: e.target.value }))}
                            className={styles.timeInput}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label>{t.dashboard.systolic}</label>
                        <input
                            type="number"
                            placeholder="120"
                            value={card.sys}
                            onChange={(e) => setCard((p) => ({ ...p, sys: e.target.value }))}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label>{t.dashboard.diastolic}</label>
                        <input
                            type="number"
                            placeholder="80"
                            value={card.dia}
                            onChange={(e) => setCard((p) => ({ ...p, dia: e.target.value }))}
                        />
                    </div>
                </div>
                <div className={styles.obsField}>
                    <label>{t.dashboard.observation}</label>
                    <textarea
                        placeholder={t.dashboard.obPlaceholder}
                        value={card.obs}
                        onChange={(e) => setCard((p) => ({ ...p, obs: e.target.value }))}
                        rows={2}
                    />
                </div>
                <button
                    className={styles.saveButton}
                    disabled={saving[period]}
                    onClick={() => saveReading(period, card)}
                >
                    {saved[period] ? t.dashboard.saved : saving[period] ? t.dashboard.saving : t.dashboard.save}
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.welcome}>
                    <p>{t.dashboard.greeting} {firstName || '...'}</p>
                    <h1>{t.dashboard.title}</h1>
                </div>
                <div className={styles.avatar}>{initials || '...'}</div>
            </header>

            <main className={styles.main}>
                <section className={styles.registration}>
                    <div className={styles.sectionHeader}>
                        <h2>{t.dashboard.registerPressure}</h2>
                        <span className={styles.date}>{t.dashboard.today} {todayFormatted()}</span>
                    </div>

                    <div className={styles.grid}>
                        <BpCard
                            period="morning"
                            icon={<Sun size={20} color="var(--primary)" />}
                            label={t.dashboard.morning}
                            card={morning}
                            setCard={setMorning}
                        />
                        <BpCard
                            period="night"
                            icon={<Moon size={20} color="var(--primary)" />}
                            label={t.dashboard.night}
                            card={night}
                            setCard={setNight}
                        />
                        <BpCard
                            period="extra"
                            icon={<Plus size={20} color="var(--primary)" />}
                            label={t.dashboard.extra}
                            card={extra}
                            setCard={setExtra}
                            customBg
                        />
                    </div>
                </section>

                <section className={styles.history}>
                    <div className={styles.sectionHeader}>
                        <h2>{t.dashboard.lastRecords}</h2>
                        <a href="/history" className={styles.seeAll}>{t.dashboard.seeAll}</a>
                    </div>

                    <div className={styles.historyList}>
                        {readings.length === 0 && (
                            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{t.dashboard.noRecords}</p>
                        )}
                        {readings.map((r) => {
                            const status = getBpStatus(r.systolic, r.diastolic);
                            return (
                                <div key={r.id} className={styles.historyItem}>
                                    <div className={styles.historyLeft}>
                                        <div className={styles.historyTime}>
                                            <strong>{formatDate(r.measured_at)}</strong>
                                            <span>{formatTime(r.measured_at)} · {periodLabel(r.period)}</span>
                                        </div>
                                        {r.observation && (
                                            <p className={styles.historyObs}>{r.observation}</p>
                                        )}
                                    </div>
                                    <div className={styles.historyValue}>
                                        <span>{r.systolic} / {r.diastolic}</span>
                                        <span className={status.className}>{status.label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
