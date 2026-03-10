'use client';

import styles from './BottomNav.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, BarChart2, Settings } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function BottomNav() {
    const pathname = usePathname();
    const { t } = useLanguage();

    if (pathname === '/login' || pathname === '/register') return null;

    const navItems = [
        { name: t.nav.home, icon: <Home size={22} />, path: '/dashboard' },
        { name: t.nav.reminders, icon: <Bell size={22} />, path: '/reminders' },
        { name: t.nav.history, icon: <BarChart2 size={22} />, path: '/history' },
        { name: t.nav.settings, icon: <Settings size={22} />, path: '/settings' },
    ];

    return (
        <nav className={styles.nav}>
            {navItems.map((item) => (
                <Link
                    key={item.path}
                    href={item.path}
                    className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
                >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.name}</span>
                </Link>
            ))}
        </nav>
    );
}
