'use client';

import styles from './history.module.css';
import { useEffect, useState } from 'react';

interface Reading {
    id: number;
    systolic: number;
    diastolic: number;
    period: string;
    observation: string | null;
    measured_at: string;
}

interface Group {
    dateLabel: string;
    items: Reading[];
}

function getBpStatus(systolic: number, diastolic: number): { label: string; color: string } {
    if (systolic < 90 || diastolic < 60) return { label: 'Baixa', color: '#3b82f6' };
    if (systolic > 180 || diastolic > 120) return { label: 'Crise', color: '#7f1d1d' };
    if (systolic >= 140 || diastolic >= 90) return { label: 'Alta', color: '#ef4444' };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Elevada', color: '#f59e0b' };
    return { label: 'Normal', color: 'var(--accent)' };
}

function periodLabel(period: string): string {
    if (period === 'morning') return 'Manhã';
    if (period === 'night') return 'Noite';
    return 'Extra';
}

function groupByDate(readings: Reading[]): Group[] {
    const map = new Map<string, Reading[]>();
    for (const r of readings) {
        const d = new Date(r.measured_at);
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}

export default function HistoryPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/readings?limit=100')
            .then((r) => r.json())
            .then((d) => setGroups(groupByDate(d.readings ?? [])))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Histórico</h1>
                <p>Acompanhe suas últimas medições</p>
            </header>

            <main className={styles.main}>
                {loading && <p style={{ color: 'var(--muted)' }}>Carregando...</p>}
                {!loading && groups.length === 0 && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Nenhum registro encontrado.</p>
                )}
                {groups.map((group) => (
                    <section key={group.dateLabel} className={styles.group}>
                        <h2 className={styles.dateHeader}>{group.dateLabel}</h2>
                        <div className={styles.list}>
                            {group.items.map((r) => {
                                const status = getBpStatus(r.systolic, r.diastolic);
                                const time = new Date(r.measured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={r.id} className={styles.item}>
                                        <div className={styles.timeInfo}>
                                            <span className={styles.time}>{time}</span>
                                            <span className={styles.label}>{periodLabel(r.period)}</span>
                                            {r.observation && (
                                                <span className={styles.obs}>{r.observation}</span>
                                            )}
                                        </div>
                                        <div className={styles.valueInfo}>
                                            <span className={styles.value}>{r.systolic} / {r.diastolic}</span>
                                            <span
                                                className={styles.badge}
                                                style={{ backgroundColor: `${status.color}18`, color: status.color }}
                                            >
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </main>
            <div className={styles.spacer} />
        </div>
    );
}
