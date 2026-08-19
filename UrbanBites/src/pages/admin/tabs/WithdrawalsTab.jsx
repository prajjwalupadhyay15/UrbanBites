import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../api/adminApi';
import { CreditCard, CheckCircle2, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WithdrawalsTab() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: pendingWithdrawals = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawals-pending'],
    queryFn: adminApi.getPendingWithdrawals
  });

  const processMut = useMutation({
    mutationFn: ({ id, body }) => adminApi.processWithdrawal(id, body),
    onSuccess: () => {
      qc.invalidateQueries(['admin-withdrawals-pending']);
      toast.success('Withdrawal processed!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to process withdrawal');
    }
  });

  const handleProcess = (id, approve) => {
    let remarks = '';
    if (!approve) {
      remarks = prompt('Enter reason for rejection (optional):');
      if (remarks === null) return; // cancelled prompt
    }
    processMut.mutate({
      id,
      body: { approve, adminRemarks: remarks }
    });
  };

  const filtered = pendingWithdrawals.filter(w => 
    w.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.bankAccountNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-[#2A0800] font-display">Pending Withdrawals</h2>
          <p className="text-[#8E7B73] font-bold">Process agent and partner payout requests</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#EADDCD] shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E7B73]" size={20} />
            <input 
              type="text"
              placeholder="Search by name or account..."
              className="w-full pl-12 pr-4 py-3 bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl focus:outline-none focus:border-[#F7B538] font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-[#8E7B73] font-bold animate-pulse">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
             <div className="w-16 h-16 bg-[#FDF9F1] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#EADDCD]">
                <CreditCard className="text-[#8E7B73]" size={32} />
             </div>
             <p className="text-[#8E7B73] font-bold text-lg">No pending withdrawals to process.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(w => (
              <div key={w.id} className="flex flex-col md:flex-row justify-between items-center p-5 bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl gap-4">
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-[#780116] text-lg">{w.userName}</h3>
                    <span className="text-[#8E7B73] text-xs font-bold bg-[#EADDCD]/30 px-3 py-1 rounded-full">
                      {new Date(w.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-bold uppercase tracking-widest">Amount</p>
                      <p className="text-xl font-black text-green-700">₹{w.amount}</p>
                    </div>
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-bold uppercase tracking-widest">Account Number</p>
                      <p className="font-bold text-[#2A0800]">{w.bankAccountNumber}</p>
                    </div>
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-bold uppercase tracking-widest">IFSC Code</p>
                      <p className="font-bold text-[#2A0800] uppercase">{w.bankIfsc}</p>
                    </div>
                    <div>
                      <p className="text-[#8E7B73] text-[10px] font-bold uppercase tracking-widest">Email</p>
                      <p className="font-bold text-[#2A0800] text-sm">{w.userEmail}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <button 
                    onClick={() => handleProcess(w.id, true)}
                    disabled={processMut.isPending}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} /> Approve
                  </button>
                  <button 
                    onClick={() => handleProcess(w.id, false)}
                    disabled={processMut.isPending}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-100 text-red-600 hover:bg-red-200 font-black rounded-xl transition-colors disabled:opacity-50"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
