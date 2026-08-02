/**
 * OrganizaGrana — Visualizador de Relatório PDF / Impressão
 * Exibe documento formatado com cabeçalho, tabela de lançamentos e botão de voltar.
 */
import React from 'react';
import { formatCurrency } from '../../utils/currency.js';
import { formatDateShort } from '../../utils/dates.js';
import { downloadOrShareFile } from '../../services/exportService.js';
import './PDFReportModal.css';

const PDFReportModal = ({ onClose, userName, periodName, summary, transactions }) => {
  const totalIncome = summary?.totalIncome || 0;
  const totalExpense = summary?.totalExpense || 0;
  const balance = summary?.balance || 0;

  const handlePrint = async () => {
    // Se estiver no ambiente Cordova Android
    if (typeof window !== 'undefined' && window.cordova) {
      const rowsHtml = transactions.map((t) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formatDateShort(t.date)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${t.description}</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.category_icon || ''} ${t.category_name || 'Geral'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${t.card_name ? '💳 ' + t.card_name : 'À vista'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${t.type === 'income' ? '#00B894' : '#D63031'};">
            ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
          </td>
        </tr>
      `).join('');

      const reportHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório Financeiro — ${periodName}</title>
          <style>
            body { font-family: sans-serif; color: #2D3436; padding: 20px; }
            .header { border-bottom: 2px solid #6C5CE7; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #6C5CE7; }
            .summary { display: flex; gap: 10px; margin-bottom: 20px; }
            .card { flex: 1; padding: 10px; background: #f8f9fa; border-radius: 6px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #f1f2f6; text-align: left; padding: 8px; border-bottom: 2px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">OrganizaGrana 💰</div>
            <div>Relatório Financeiro Mensal — ${periodName}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">Gerado para: ${userName || 'Usuário'}</div>
          </div>
          <div class="summary">
            <div class="card"><div>SALDO</div><strong>${formatCurrency(balance)}</strong></div>
            <div class="card"><div>RECEITAS</div><strong style="color: #00B894;">${formatCurrency(totalIncome)}</strong></div>
            <div class="card"><div>DESPESAS</div><strong style="color: #D63031;">${formatCurrency(totalExpense)}</strong></div>
          </div>
          <h3>Extrato Detalhado</h3>
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th style="text-align: right;">Valor</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
        </html>
      `;

      try {
        await downloadOrShareFile(reportHtml, `Relatorio_${periodName.replace(/\s+/g, '_')}.html`, 'text/html', 'Relatório Financeiro OrganizaGrana');
      } catch (err) {
        console.error('[PDFReportModal] Erro ao compartilhar relatório:', err);
      }
      return;
    }

    // Se estiver no navegador web convencional
    window.print();
  };

  return (
    <div className="pdf-modal-overlay">
      {/* Top Header com botão de voltar */}
      <div className="pdf-modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="og-back-btn" onClick={onClose} aria-label="Voltar">
            ←
          </button>
          <div>
            <h2 className="pdf-modal-header__title">Relatório Financeiro</h2>
            <p className="pdf-modal-header__subtitle">{periodName}</p>
          </div>
        </div>

        <button className="og-btn og-btn--primary og-btn--sm" onClick={handlePrint}>
          Imprimir / PDF
        </button>
      </div>

      {/* Documento Impresso */}
      <div className="pdf-modal-body og-scrollable">
        <div className="pdf-document PrintableReport">
          {/* Header do Documento */}
          <div className="pdf-doc-header">
            <div>
              <div className="pdf-doc-brand">OrganizaGrana 💰</div>
              <div className="pdf-doc-sub">Relatório Financeiro Mensal</div>
            </div>
            <div className="pdf-doc-meta">
              <p>Período: <strong>{periodName}</strong></p>
              <p>Usuário: <strong>{userName || 'Usuário'}</strong></p>
              <p>Emitido em: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
            </div>
          </div>

          {/* Cartões de Resumo */}
          <div className="pdf-doc-summary">
            <div className="pdf-doc-card">
              <span className="pdf-doc-card__label">Saldo do Mês</span>
              <span className={`pdf-doc-card__value ${balance >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
            <div className="pdf-doc-card">
              <span className="pdf-doc-card__label">Total Receitas</span>
              <span className="pdf-doc-card__value text-income">{formatCurrency(totalIncome)}</span>
            </div>
            <div className="pdf-doc-card">
              <span className="pdf-doc-card__label">Total Despesas</span>
              <span className="pdf-doc-card__value text-expense">{formatCurrency(totalExpense)}</span>
            </div>
          </div>

          {/* Tabela de Transações */}
          <h3 className="pdf-doc-section-title">Extrato Detalhado</h3>
          <div className="pdf-table-responsive">
            <table className="pdf-doc-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Forma / Cartão</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                      Nenhum lançamento registrado neste mês.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td>{formatDateShort(t.date)}</td>
                      <td>
                        <strong>{t.description}</strong>
                        {t.notes && <span className="pdf-doc-notes"><br />{t.notes}</span>}
                      </td>
                      <td>
                        {t.category_icon || '📁'} {t.category_name || 'Geral'}
                      </td>
                      <td>{t.card_name ? `💳 ${t.card_name}` : 'À vista'}</td>
                      <td
                        style={{ textAlign: 'right', fontWeight: 'bold' }}
                        className={t.type === 'income' ? 'text-income' : 'text-expense'}
                      >
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pdf-doc-footer">
            OrganizaGrana — Controle Financeiro Pessoal
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReportModal;
