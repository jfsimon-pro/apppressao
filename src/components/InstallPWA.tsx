'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import styles from './InstallPWA.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Já instalado (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detecta iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Android/Chrome: captura o evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstallAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }

  // Não mostra nada se já instalado
  if (isInstalled) return null;

  // Android: mostra botão de instalar quando o evento estiver disponível
  if (!isIOS && deferredPrompt) {
    return (
      <button className={styles.installBtn} onClick={handleInstallAndroid}>
        <Download size={18} />
        Instalar app
      </button>
    );
  }

  // iOS: mostra botão que abre as instruções
  if (isIOS) {
    return (
      <>
        <button className={styles.installBtn} onClick={() => setShowIOSGuide(true)}>
          <Share size={18} />
          Adicionar à tela inicial
        </button>

        {showIOSGuide && (
          <div className={styles.overlay} onClick={() => setShowIOSGuide(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeBtn} onClick={() => setShowIOSGuide(false)}>
                <X size={20} />
              </button>
              <h3>Instalar no iPhone / iPad</h3>
              <ol className={styles.steps}>
                <li>
                  Toque no ícone de compartilhar{' '}
                  <span className={styles.icon}>
                    <Share size={16} />
                  </span>{' '}
                  na barra do Safari
                </li>
                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
              </ol>
              <p className={styles.note}>O app abrirá em tela cheia, como um app nativo.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
