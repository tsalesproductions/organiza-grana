/**
 * OrganizaGrana — Utilitário para Compartilhar e Baixar Arquivos (CSV, JSON, PDF)
 */
import { formatDateShort } from '../utils/dates.js';

/**
 * Baixa ou compartilha um arquivo nativamente no dispositivo (via Cordova File + SocialSharing).
 */
export const downloadOrShareFile = (contentString, fileName, mimeType, shareText = 'Exportação do OrganizaGrana') => {
  const blob = new Blob([contentString], { type: mimeType });

  return new Promise((resolve, reject) => {
    // 1. Cordova Native Implementation (cordova-plugin-file + cordova-plugin-x-socialsharing)
    if (
      typeof window !== 'undefined' &&
      window.cordova &&
      window.cordova.file &&
      window.plugins?.socialsharing
    ) {
      window.resolveLocalFileSystemURL(
        window.cordova.file.cacheDirectory,
        (dirEntry) => {
          dirEntry.getFile(
            fileName,
            { create: true },
            (fileEntry) => {
              fileEntry.createWriter(
                (fileWriter) => {
                  fileWriter.write(blob);
                  fileWriter.onwriteend = () => {
                    console.log('[Export] Salvo no cache:', fileEntry.nativeURL);

                    window.plugins.socialsharing.share(
                      shareText,
                      fileName,
                      fileEntry.nativeURL,
                      null,
                      () => {
                        console.log('[Export] Compartilhado com sucesso');
                        fileEntry.remove(() => {});
                        resolve(true);
                      },
                      (err) => {
                        console.error('[Export] Erro ao compartilhar:', err);
                        fileEntry.remove(() => {});
                        reject(err);
                      }
                    );
                  };

                  fileWriter.onerror = (e) => {
                    console.error('[Export] Erro ao escrever arquivo:', e);
                    reject(e);
                  };
                },
                (err) => reject(err)
              );
            },
            (err) => reject(err)
          );
        },
        (err) => reject(err)
      );
      return;
    }

    // 2. Fallback Web (Web Share API)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({
              files: [file],
              title: fileName,
              text: shareText,
            })
            .then(() => resolve(true))
            .catch(() => resolve(false));
          return;
        }
      } catch (_) {}
    }

    // 3. Fallback Web Browser convencional
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    resolve(true);
  });
};

/**
 * Exporta lista de transações para formato CSV (Excel UTF-8).
 */
export const exportTransactionsToCSV = async (transactions = [], fileName = 'extrato_organizagrana.csv') => {
  if (!transactions.length) {
    throw new Error('Nenhum dado para exportar.');
  }

  const header = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Cartão'];
  const rows = transactions.map((t) => [
    formatDateShort(t.date),
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.type === 'income' ? 'Receita' : 'Despesa',
    `"${(t.category_name || 'Geral').replace(/"/g, '""')}"`,
    t.amount ? t.amount.toFixed(2).replace('.', ',') : '0,00',
    `"${(t.card_name || '-').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  await downloadOrShareFile(csvContent, fileName, 'text/csv;charset=utf-8;', 'Extrato Financeiro em CSV');
};
