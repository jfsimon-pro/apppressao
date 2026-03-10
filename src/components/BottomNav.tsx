'use client';

import styles from './BottomNav.module.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bell, BarChart2, Settings } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    if (pathname === '/login' || pathname === '/register') return null;

    const navItems = [
        { name: 'Início', icon: <Home size={22} />, path: '/dashboard' },
        { name: 'Lembretes', icon: <Bell size={22} />, path: '/reminders' },
        { name: 'Histórico', icon: <BarChart2 size={22} />, path: '/history' },
        { name: 'Configurações', icon: <Settings size={22} />, path: '/settings' },
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
