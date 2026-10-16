import React, { useState } from 'react';
import { X, ShieldAlert, UserX, Clock, Check } from 'lucide-react';
import { LGPD_STATUTORY_DAYS } from '@dieta-ai/core';

interface AccountManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onRequestDeletion: () => void;
  onAdminPurge: (targetUserId?: string) => void;
}

export const AccountManagementModal: React.FC<AccountManagementModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onRequestDeletion,
  onAdminPurge,
}) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [purgeRequested, setPurgeRequested] = useState(false);
  const [adminActionSuccess, setAdminActionSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUserRequest = () => {
    onRequestDeletion();
    setPurgeRequested(true);
  };

  const handleAdminPurge = () => {
    onAdminPurge(targetUserId);
    setAdminActionSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-m3-surface-container-high border border-m3-outline rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-m3-on-surface">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-m3-outline hover:text-m3-on-surface p-1 rounded-full hover:bg-m3-surface-container-highest transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-m3-primary">
          <ShieldAlert className="w-5 h-5" />
          Gerenciamento de Conta & LGPD
        </h2>
        <p className="text-xs text-m3-outline mb-5">
          Conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>

        {/* Seção do Usuário Comum: Autoatendimento de Exclusão */}
        <div className="bg-m3-surface-container-low p-4 rounded-2xl border border-m3-outline-variant mb-5">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <UserX className="w-4 h-4 text-m3-error" />
            Solicitar Remoção da Conta (Autoatendimento)
          </h3>
          <p className="text-xs text-m3-on-surface-variant leading-relaxed mb-4">
            Em conformidade com os artigos 18 e 19 da LGPD, você tem o direito garantido de solicitar
            a eliminação definitiva dos seus dados pessoais e registros alimentares/biométricos.
          </p>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 mb-4 flex items-start gap-2.5 text-xs text-amber-200">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-semibold">Notificação Legal de Prazo:</span> O sistema iniciará a
              fila de expurgo e todos os seus dados serão eliminados em até{' '}
              <strong className="underline">{LGPD_STATUTORY_DAYS} (quinze) dias</strong> a contar
              da data do requerimento.
            </div>
          </div>

          {purgeRequested ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Solicitação protocolada com sucesso. A conta será expurgada no prazo legal.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUserRequest}
              className="w-full bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-100 font-medium text-xs py-2.5 px-4 rounded-xl transition-colors"
            >
              Solicitar Exclusão da Conta
            </button>
          )}
        </div>

        {/* Seção Administrativa (Visível apenas se isAdmin) */}
        {isAdmin && (
          <div className="bg-m3-surface-container-lowest p-4 rounded-2xl border border-m3-error/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-m3-error flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Painel de Administração (Acesso Restrito)
              </h3>
              <span className="text-[10px] font-mono bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-m3-outline mb-3">
              Permite a remoção imediata, forçada e irreversível de qualquer conta ou usuário de teste/produção.
            </p>

            <input
              type="text"
              placeholder="Google Subject ID ou User ID a expurgar"
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              className="w-full bg-m3-surface-container-high border border-m3-outline-variant rounded-xl px-3 py-2 text-xs font-mono mb-3 text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />

            {adminActionSuccess ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Usuário expurgado permanentemente do Firestore e do Cloud Storage.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdminPurge}
                className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-colors"
              >
                Exclusão Imediata e Irreversível
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
