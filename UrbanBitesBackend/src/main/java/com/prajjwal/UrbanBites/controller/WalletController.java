package com.prajjwal.UrbanBites.controller;

import com.prajjwal.UrbanBites.dto.response.WalletResponse;
import com.prajjwal.UrbanBites.dto.response.WalletTransactionResponse;
import com.prajjwal.UrbanBites.entity.Wallet;
import com.prajjwal.UrbanBites.service.WalletService;
import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import com.prajjwal.UrbanBites.dto.request.WithdrawalRequestDto;
import com.prajjwal.UrbanBites.dto.response.WithdrawalResponseDto;
import com.prajjwal.UrbanBites.entity.User;
import com.prajjwal.UrbanBites.entity.WithdrawalRequest;
import com.prajjwal.UrbanBites.repository.UserRepository;
import com.prajjwal.UrbanBites.repository.WithdrawalRequestRepository;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    public WalletController(WalletService walletService,
                            UserRepository userRepository,
                            WithdrawalRequestRepository withdrawalRequestRepository) {
        this.walletService = walletService;
        this.userRepository = userRepository;
        this.withdrawalRequestRepository = withdrawalRequestRepository;
    }

    @GetMapping("/balance")
    public ResponseEntity<WalletResponse> getBalance(Principal principal) {
        Wallet wallet = walletService.getWalletByEmail(principal.getName());
        return ResponseEntity.ok(new WalletResponse(wallet.getId(), wallet.getBalance()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<WalletTransactionResponse>> getHistory(Principal principal) {
        Wallet wallet = walletService.getWalletByEmail(principal.getName());
        List<WalletTransactionResponse> history = walletService.getTransactionHistory(wallet.getId())
                .stream()
                .map(tx -> new WalletTransactionResponse(
                        tx.getId(),
                        tx.getAmount(),
                        tx.getType(),
                        tx.getReferenceType(),
                        tx.getReferenceId(),
                        tx.getDescription(),
                        tx.getCreatedAt()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<WithdrawalResponseDto> requestWithdrawal(@Valid @RequestBody WithdrawalRequestDto request, Principal principal) {
        User user = userRepository.findByEmailIgnoreCase(principal.getName()).orElseThrow();
        WithdrawalRequest req = walletService.requestWithdrawal(
                user.getId(),
                request.getAmount(),
                request.getBankAccountNumber(),
                request.getBankIfsc()
        );
        return ResponseEntity.ok(toDto(req));
    }

    @GetMapping("/withdrawals")
    public ResponseEntity<List<WithdrawalResponseDto>> getWithdrawals(Principal principal) {
        User user = userRepository.findByEmailIgnoreCase(principal.getName()).orElseThrow();
        List<WithdrawalResponseDto> dtos = withdrawalRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    private WithdrawalResponseDto toDto(WithdrawalRequest req) {
        return new WithdrawalResponseDto(
                req.getId(),
                req.getUser().getFullName(),
                req.getUser().getEmail(),
                req.getAmount(),
                req.getBankAccountNumber(),
                req.getBankIfsc(),
                req.getStatus(),
                req.getAdminRemarks(),
                req.getCreatedAt(),
                req.getProcessedAt()
        );
    }
}
