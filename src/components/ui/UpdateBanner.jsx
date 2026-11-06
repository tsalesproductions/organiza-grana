/**
 * OrganizaGrana — UpdateBanner
 * Notificação discreta de nova versão disponível via GitHub Releases.
 * Apresenta opções de "Baixar" (redireciona para o release/APK no GitHub) e "Fechar".
 */
import React from 'react';
import { DownloadCloud, X, ArrowUpRight } from 'lucide-react';
import { openExternalUrl } from '../../services/updateService.js';
import './UpdateBanner.css';

const UpdateBanner = ({ update, onDismiss }) => {
  if (!update) return null;

  const handleDownload = () => {
    openExternalUrl(update.downloadUrl || update.releaseUrl);
  };

  return (
    <div className="og-update-banner animate-slide-up" role="alert">
      <div className="og-update-banner__icon">
        <DownloadCloud size={18} className="text-primary" />
      </div>

      <div className="og-update-banner__content">
        <p className="og-update-banner__title">
          Nova versão <strong>v{update.latestVersion}</strong> disponível
        </p>
        <p className="og-update-banner__sub">
          Toque para atualizar e receber as novidades
        </p>
      </div>

      <div className="og-update-banner__actions">
        <button
          type="button"
          className="og-update-banner__btn-download"
          onClick={handleDownload}
        >
          Baixar <ArrowUpRight size={13} />
        </button>
        <button
          type="button"
          className="og-update-banner__btn-close"
          onClick={onDismiss}
          aria-label="Dispensar aviso de atualização"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
