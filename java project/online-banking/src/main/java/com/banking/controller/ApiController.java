package com.banking.controller;

import com.banking.model.Account;
import com.banking.model.Transaction;
import com.banking.model.User;
import com.banking.repository.AccountRepository;
import com.banking.repository.TransactionRepository;
import com.banking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    static class AuthRequest {
        public String username;
        public String password;
    }
    
    static class TransactionRequest {
        public Long accountId;
        public Double amount;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (userRepository.findByUsername(req.username) != null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }
        User user = new User(req.username, req.password);
        user = userRepository.save(user);

        // Create a default account for the user
        String accNum = "ACC" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Account account = new Account(accNum, 0.0, user);
        accountRepository.save(account);

        return ResponseEntity.ok(Map.of("message", "Registered successfully", "userId", user.getId()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        User user = userRepository.findByUsername(req.username);
        if (user != null && user.getPassword().equals(req.password)) {
            return ResponseEntity.ok(Map.of("message", "Login successful", "userId", user.getId(), "username", user.getUsername()));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody AuthRequest req) {
        User user = userRepository.findByUsername(req.username);
        if (user != null) {
            user.setPassword(req.password);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
    }

    @GetMapping("/accounts/{userId}")
    public ResponseEntity<?> getAccounts(@PathVariable Long userId) {
        List<Account> accounts = accountRepository.findByUserId(userId);
        return ResponseEntity.ok(accounts);
    }

    @PostMapping("/deposit")
    public ResponseEntity<?> deposit(@RequestBody TransactionRequest req) {
        if (req.amount <= 0) return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount"));
        
        Account account = accountRepository.findById(req.accountId).orElse(null);
        if (account == null) return ResponseEntity.badRequest().body(Map.of("error", "Account not found"));

        account.setBalance(account.getBalance() + req.amount);
        accountRepository.save(account);

        Transaction t = new Transaction("DEPOSIT", req.amount, LocalDateTime.now(), account);
        transactionRepository.save(t);

        return ResponseEntity.ok(Map.of("message", "Deposit successful", "balance", account.getBalance()));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<?> withdraw(@RequestBody TransactionRequest req) {
        if (req.amount <= 0) return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount"));
        
        Account account = accountRepository.findById(req.accountId).orElse(null);
        if (account == null) return ResponseEntity.badRequest().body(Map.of("error", "Account not found"));

        if (account.getBalance() < req.amount) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient funds"));
        }

        account.setBalance(account.getBalance() - req.amount);
        accountRepository.save(account);

        Transaction t = new Transaction("WITHDRAWAL", req.amount, LocalDateTime.now(), account);
        transactionRepository.save(t);

        return ResponseEntity.ok(Map.of("message", "Withdrawal successful", "balance", account.getBalance()));
    }

    @GetMapping("/transactions/{accountId}")
    public ResponseEntity<?> getTransactions(@PathVariable Long accountId) {
        List<Transaction> transactions = transactionRepository.findByAccountIdOrderByTimestampDesc(accountId);
        return ResponseEntity.ok(transactions);
    }
}
