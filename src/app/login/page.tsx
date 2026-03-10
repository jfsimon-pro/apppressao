'use client';

import styles from './login.module.css';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InstallPWA from '@/components/InstallPWA';
import { useLanguage } from '@/lib/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Activity size={48} color="var(--primary)" />
          </div>
          <h1>myBPBuddy</h1>
          <p>{t.login.tagline}</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.inputGroup}>
            <label htmlFor="email">{t.login.email}</label>
            <input
              type="email"
              id="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">{t.login.password}</label>
            <input
              type="password"
              id="password"
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? t.login.loggingIn : t.login.loginButton}
          </button>

          <div className={styles.forgotPassword}>
            <a href="#">{t.login.forgotPassword}</a>
          </div>
        </form>

        <div className={styles.footer}>
          <p>{t.login.noAccount} <Link href="/register">{t.login.createNow}</Link></p>
        </div>

        <InstallPWA />
      </div>
    </div>
  );
}
