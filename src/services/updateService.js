/**
 * OrganizaGrana — Serviço de Atualização via GitHub Releases API
 * Verifica se há novas versões disponíveis no repositório oficial:
 * https://github.com/tsalesproductions/organiza-grana
 */

export const CURRENT_APP_VERSION = '1.1.0';
const GITHUB_REPO = 'tsalesproductions/organiza-grana';
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

/**
 * Compara duas versões SemVer (ex: "1.2.0" vs "1.1.0" ou "v1.2.1" vs "v1.2.0").
 * @returns {number} 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
 */
export const compareVersions = (v1, v2) => {
  const clean1 = (v1 || '').replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10) || 0);
  const clean2 = (v2 || '').replace(/^[^\d]*/, '').split('.').map(n => parseInt(n, 10) || 0);

  const len = Math.max(clean1.length, clean2.length, 3);
  for (let i = 0; i < len; i++) {
    const p1 = clean1[i] || 0;
    const p2 = clean2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Abre URL externamente no navegador nativo do sistema
 */
export const openExternalUrl = (url) => {
  if (!url) return;
  try {
    if (window.cordova?.InAppBrowser) {
      window.cordova.InAppBrowser.open(url, '_system');
    } else {
      window.open(url, '_system') || window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (_) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Consulta a API do GitHub Releases para verificar se há versão superior à atual.
 * @param {boolean} force - se true, ignora cache e dispensas anteriores
 * @returns {Promise<Object|null>}
 */
export const checkForAppUpdate = async (force = false) => {
  try {
    // Throttle: evita bater na API mais de 1x a cada 30 minutos
    const lastCheckStr = localStorage.getItem('og_last_update_check');
    const now = Date.now();
    if (!force && lastCheckStr) {
      const elapsed = now - parseInt(lastCheckStr, 10);
      if (elapsed < 30 * 60 * 1000) {
        return null;
      }
    }

    localStorage.setItem('og_last_update_check', String(now));

    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const release = await response.json();
    if (!release || !release.tag_name) {
      return null;
    }

    const latestTag = release.tag_name;
    const cleanLatest = latestTag.replace(/^v/i, '');

    // Verifica se a versão do GitHub é estritamente maior que a atual
    if (compareVersions(cleanLatest, CURRENT_APP_VERSION) > 0) {
      // Verifica se o usuário já dispensou essa versão específica
      const dismissed = localStorage.getItem('og_dismissed_update_version');
      if (!force && dismissed === cleanLatest) {
        return null;
      }

      // Procura asset de APK na release se houver
      const apkAsset = Array.isArray(release.assets)
        ? release.assets.find((a) => a.name && a.name.toLowerCase().endsWith('.apk'))
        : null;

      return {
        hasUpdate: true,
        latestVersion: cleanLatest,
        currentVersion: CURRENT_APP_VERSION,
        releaseUrl: release.html_url,
        downloadUrl: apkAsset ? apkAsset.browser_download_url : release.html_url,
        releaseName: release.name || latestTag,
        publishedAt: release.published_at,
      };
    }

    return null;
  } catch (err) {
    console.warn('[UpdateService] Não foi possível verificar atualização:', err);
    return null;
  }
};

/**
 * Marca uma versão como dispensada para não alertar novamente até uma nova sair
 */
export const dismissUpdate = (version) => {
  try {
    localStorage.setItem('og_dismissed_update_version', String(version));
  } catch (_) {}
};
