'use client';

import styles from './dashboard.module.css';
import { Sun, Moon, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

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

function getBpStatus(systolic: number, diastolic: number): { label: string; className: string } {
    if (systolic < 90 || diastolic < 60) return { label: 'Baixa', className: styles.statusBaixa };
    if (systolic > 180 || diastolic > 120) return { label: 'Crise', className: styles.statusCrise };
    if (systolic >= 140 || diastolic >= 90) return { label: 'Alta', className: styles.statusAlta };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Elevada', className: styles.statusElevada };
    return { label: 'Normal', className: styles.statusNormal };
}

function periodLabel(period: string): string {
    if (period === 'morning') return 'Manhã';
    if (period === 'night') return 'Noite';
    return 'Extra';
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function todayFormatted(): string {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function buildMeasuredAt(time: string): string | undefined {
    if (!time) return undefined;
    const [h, m] = time.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m), 0, 0);
    return d.toISOString();
}

const emptyCard = (): CardState => ({ sys: '', dia: '', time: '', obs: '' });

export default function DashboardPage() {
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
                        <label>Hora</label>
                        <input
                            type="time"
                            value={card.time}
                            onChange={(e) => setCard((p) => ({ ...p, time: e.target.value }))}
                            className={styles.timeInput}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label>Sist.</label>
                        <input
                            type="number"
                            placeholder="120"
                            value={card.sys}
                            onChange={(e) => setCard((p) => ({ ...p, sys: e.target.value }))}
                        />
                    </div>
                    <div className={styles.inputField}>
                        <label>Diast.</label>
                        <input
                            type="number"
                            placeholder="80"
                            value={card.dia}
                            onChange={(e) => setCard((p) => ({ ...p, dia: e.target.value }))}
                        />
                    </div>
                </div>
                <div className={styles.obsField}>
                    <label>Observação</label>
                    <textarea
                        placeholder="Como você está se sentindo? (opcional)"
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
                    {saved[period] ? 'Salvo ✓' : saving[period] ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.welcome}>
                    <p>Olá, {firstName || '...'}</p>
                    <h1>Painel de Saúde</h1>
                </div>
                <div className={styles.avatar}>{initials || '...'}</div>
            </header>

            <main className={styles.main}>
                <section className={styles.registration}>
                    <div className={styles.sectionHeader}>
                        <h2>Registrar Pressão</h2>
                        <span className={styles.date}>Hoje, {todayFormatted()}</span>
                    </div>

                    <div className={styles.grid}>
                        <BpCard
                            period="morning"
                            icon={<Sun size={20} color="var(--primary)" />}
                            label="Manhã"
                            card={morning}
                            setCard={setMorning}
                        />
                        <BpCard
                            period="night"
                            icon={<Moon size={20} color="var(--primary)" />}
                            label="Noite"
                            card={night}
                            setCard={setNight}
                        />
                        <BpCard
                            period="extra"
                            icon={<Plus size={20} color="var(--primary)" />}
                            label="Extra"
                            card={extra}
                            setCard={setExtra}
                            customBg
                        />
                    </div>
                </section>

                <section className={styles.history}>
                    <div className={styles.sectionHeader}>
                        <h2>Últimos Registros</h2>
                        <a href="/history" className={styles.seeAll}>Ver todos</a>
                    </div>

                    <div className={styles.historyList}>
                        {readings.length === 0 && (
                            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Nenhum registro ainda.</p>
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
