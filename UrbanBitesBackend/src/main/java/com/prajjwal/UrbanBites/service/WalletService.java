package com.prajjwal.UrbanBites.service;

import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.entity.Wallet;
import com.prajjwal.UrbanBites.entity.WalletTransaction;
import com.prajjwal.UrbanBites.enums.WalletTransactionReferenceType;
import com.prajjwal.UrbanBites.enums.WalletTransactionType;
import com.prajjwal.UrbanBites.exception.ApiException;
import com.prajjwal.UrbanBites.entity.WithdrawalRequest;
import com.prajjwal.UrbanBites.enums.WithdrawalStatus;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.repository.WalletRepository;
import com.prajjwal.UrbanBites.repository.WalletTransactionRepository;
import com.prajjwal.UrbanBites.repository.WithdrawalRequestRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final UserRepository userRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    public WalletService(WalletRepository walletRepository, 
                         WalletTransactionRepository walletTransactionRepository,
                         UserRepository userRepository,
                         WithdrawalRequestRepository withdrawalRequestRepository) {
        this.walletRepository = walletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.userRepository = userRepository;
        this.withdrawalRequestRepository = withdrawalRequestRepository;
    }

    @Transactional
    public Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
            Wallet wallet = new Wallet();
            wallet.setUser(user);
            wallet.setBalance(BigDecimal.ZERO);
            return walletRepository.save(wallet);
        });
    }

    @Transactional
    public Wallet getWalletByEmail(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return getOrCreateWallet(user.getId());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WalletTransaction credit(Long userId, BigDecimal amount, WalletTransactionReferenceType refType, Long refId, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Credit amount must be greater than zero");
        }
        
        Wallet wallet = getOrCreateWallet(userId);
        
        wallet.setBalance(wallet.getBalance().add(amount).setScale(2, RoundingMode.HALF_UP));
        wallet = walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        tx.setType(WalletTransactionType.CREDIT);
        tx.setReferenceType(refType);
        tx.setReferenceId(refId);
        tx.setDescription(description);
        
        return walletTransactionRepository.save(tx);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WalletTransaction debit(Long userId, BigDecimal amount, WalletTransactionReferenceType refType, Long refId, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Debit amount must be greater than zero");
        }

        Wallet wallet = getOrCreateWallet(userId);

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Insufficient wallet balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount).setScale(2, RoundingMode.HALF_UP));
        wallet = walletRepository.save(wallet);

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        tx.setType(WalletTransactionType.DEBIT);
        tx.setReferenceType(refType);
        tx.setReferenceId(refId);
        tx.setDescription(description);

        return walletTransactionRepository.save(tx);
    }

    public List<WalletTransaction> getTransactionHistory(Long walletId) {
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(walletId);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WithdrawalRequest requestWithdrawal(Long userId, BigDecimal amount, String bankAccountNumber, String bankIfsc) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Withdrawal amount must be greater than zero");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        // Debit the wallet immediately
        debit(userId, amount, WalletTransactionReferenceType.WITHDRAWAL, null, "Withdrawal Request");

        // Create the pending request
        WithdrawalRequest req = new WithdrawalRequest();
        req.setUser(user);
        req.setAmount(amount);
        req.setBankAccountNumber(bankAccountNumber);
        req.setBankIfsc(bankIfsc);
        return withdrawalRequestRepository.save(req);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WithdrawalRequest processWithdrawal(java.util.UUID requestId, boolean approve, String remarks) {
        WithdrawalRequest req = withdrawalRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Withdrawal request not found"));

        if (req.getStatus() != WithdrawalStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Withdrawal request is already processed");
        }

        req.setAdminRemarks(remarks);
        req.setProcessedAt(OffsetDateTime.now());

        if (approve) {
            req.setStatus(WithdrawalStatus.COMPLETED);
        } else {
            req.setStatus(WithdrawalStatus.REJECTED);
            // Refund the wallet
            credit(req.getUser().getId(), req.getAmount(), WalletTransactionReferenceType.WITHDRAWAL, null, "Refund: Withdrawal Rejected");
        }

        return withdrawalRequestRepository.save(req);
    }
}
