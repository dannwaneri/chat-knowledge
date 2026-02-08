interface SensitivePattern {
    type: 'api_key' | 'private_url' | 'email' | 'ip_address' | 'credentials' | 'pii';
    pattern: RegExp;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }
  
  interface DetectedIssue {
    type: string;
    severity: string;
    location: string; // Which message/chunk
    preview: string; // First 20 chars
    suggestion: string;
    autoRedact: boolean;
  }
  
  interface SanitizationReport {
    safe: boolean;
    detected: DetectedIssue[];
    warnings: string[];
    stats: {
      totalMessages: number;
      scannedChars: number;
      issuesFound: number;
      criticalIssues: number;
    };
  }
  
  export class ChatSanitizer {
    private patterns: SensitivePattern[] = [
      // API Keys
      {
        type: 'api_key',
        pattern: /(?:sk|pk|token|key|secret|api)[-_]?[a-zA-Z0-9]{20,}/gi,
        severity: 'critical',
        description: 'Possible API key or secret token'
      },
      {
        type: 'api_key',
        pattern: /AKIA[0-9A-Z]{16}/g, // AWS Access Key
        severity: 'critical',
        description: 'AWS Access Key ID'
      },
      {
        type: 'api_key',
        pattern: /AIza[0-9A-Za-z\-_]{35}/g, // Google API Key
        severity: 'critical',
        description: 'Google API Key'
      },
      {
        type: 'api_key',
        pattern: /sk_live_[0-9a-zA-Z]{24,}/g, // Stripe Live Key
        severity: 'critical',
        description: 'Stripe Live API Key'
      },
      {
        type: 'api_key',
        pattern: /ghp_[0-9a-zA-Z]{36}/g, // GitHub Personal Access Token
        severity: 'critical',
        description: 'GitHub Personal Access Token'
      },
  
      // Private URLs
      {
        type: 'private_url',
        pattern: /https?:\/\/[a-zA-Z0-9.-]*\.(local|internal|corp|vpn|lan)/gi,
        severity: 'high',
        description: 'Internal/private domain URL'
      },
      {
        type: 'private_url',
        pattern: /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/gi,
        severity: 'high',
        description: 'Localhost or private IP address URL'
      },
      {
        type: 'private_url',
        pattern: /staging\.|dev\.|test\.|internal\./gi,
        severity: 'medium',
        description: 'Possible staging/dev environment'
      },
  
      // Credentials
      {
        type: 'credentials',
        pattern: /password\s*[=:]\s*['"][^'"]{6,}['"]/gi,
        severity: 'critical',
        description: 'Hardcoded password'
      },
      {
        type: 'credentials',
        pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g,
        severity: 'critical',
        description: 'Bearer token'
      },
  
      // Email addresses
      {
        type: 'email',
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        severity: 'medium',
        description: 'Email address'
      },
  
      // IP Addresses
      {
        type: 'ip_address',
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        severity: 'medium',
        description: 'IP address'
      },
  
      // PII (Phone numbers - simple pattern)
      {
        type: 'pii',
        pattern: /\+?[1-9]\d{1,14}/g, // International format
        severity: 'low',
        description: 'Possible phone number'
      }
    ];
  
    /**
     * Scan chat content for sensitive data
     */
    async scanChat(messages: Array<{ speaker: string; content: string }>): Promise<SanitizationReport> {
      const detected: DetectedIssue[] = [];
      let totalChars = 0;
  
      messages.forEach((msg, index) => {
        totalChars += msg.content.length;
  
        this.patterns.forEach((pattern) => {
          const matches = msg.content.match(pattern.pattern);
          
          if (matches) {
            matches.forEach((match) => {
              detected.push({
                type: pattern.type,
                severity: pattern.severity,
                location: `Message ${index + 1} (${msg.speaker})`,
                preview: this.maskSensitive(match),
                suggestion: this.getSuggestion(pattern.type),
                autoRedact: pattern.severity === 'critical'
              });
            });
          }
        });
      });
  
      const criticalIssues = detected.filter(d => d.severity === 'critical').length;
      const warnings = this.generateWarnings(detected);
  
      return {
        safe: criticalIssues === 0,
        detected,
        warnings,
        stats: {
          totalMessages: messages.length,
          scannedChars: totalChars,
          issuesFound: detected.length,
          criticalIssues
        }
      };
    }
  
    /**
     * Auto-redact sensitive data
     */
    async redactChat(
      messages: Array<{ speaker: string; content: string }>,
      options: { autoRedactCritical: boolean } = { autoRedactCritical: true }
    ): Promise<Array<{ speaker: string; content: string; redacted: boolean }>> {
      return messages.map((msg) => {
        let content = msg.content;
        let redacted = false;
  
        this.patterns.forEach((pattern) => {
          if (!options.autoRedactCritical && pattern.severity === 'critical') {
            return; // Skip auto-redaction if disabled
          }
  
          if (pattern.severity === 'critical') {
            const replacement = this.getRedactionReplacement(pattern.type);
            content = content.replace(pattern.pattern, replacement);
            redacted = true;
          }
        });
  
        return { ...msg, content, redacted };
      });
    }
  
    /**
     * Get safe preview of sensitive data (first 4, last 4 chars)
     */
    private maskSensitive(value: string): string {
      if (value.length <= 10) {
        return '***';
      }
      const start = value.substring(0, 4);
      const end = value.substring(value.length - 4);
      return `${start}...${end}`;
    }
  
    /**
     * Get redaction replacement text
     */
    private getRedactionReplacement(type: string): string {
      const replacements = {
        api_key: '[REDACTED_API_KEY]',
        credentials: '[REDACTED_PASSWORD]',
        private_url: '[REDACTED_INTERNAL_URL]',
        email: '[REDACTED_EMAIL]',
        ip_address: '[REDACTED_IP]',
        pii: '[REDACTED_PII]'
      };
      return replacements[type] || '[REDACTED]';
    }
  
    /**
     * Get suggestion for remediation
     */
    private getSuggestion(type: string): string {
      const suggestions = {
        api_key: 'Replace with environment variable reference (e.g., process.env.API_KEY)',
        credentials: 'Remove password or use placeholder (e.g., "YOUR_PASSWORD_HERE")',
        private_url: 'Replace with generic URL (e.g., "https://your-api.example.com")',
        email: 'Consider if email needs to be included. Replace with example@example.com if possible',
        ip_address: 'Replace with example IP (e.g., 192.0.2.1) or remove',
        pii: 'Review if personal information is necessary for the conversation'
      };
      return suggestions[type] || 'Review and redact if sensitive';
    }
  
    /**
     * Generate human-readable warnings
     */
    private generateWarnings(detected: DetectedIssue[]): string[] {
      const warnings: string[] = [];
  
      const criticalCount = detected.filter(d => d.severity === 'critical').length;
      if (criticalCount > 0) {
        warnings.push(
          `⚠️ CRITICAL: Found ${criticalCount} sensitive items (API keys, passwords, tokens). These will be auto-redacted.`
        );
      }
  
      const privateUrls = detected.filter(d => d.type === 'private_url').length;
      if (privateUrls > 0) {
        warnings.push(
          `⚠️ Found ${privateUrls} internal/private URLs. Review before sharing.`
        );
      }
  
      const emails = detected.filter(d => d.type === 'email').length;
      if (emails > 0) {
        warnings.push(
          `ℹ️ Found ${emails} email addresses. Consider if they should be public.`
        );
      }
  
      return warnings;
    }
  
    /**
     * Generate detailed report for UI
     */
    generateUIReport(report: SanitizationReport): string {
      const lines: string[] = [];
      
      lines.push('='.repeat(60));
      lines.push('SECURITY SCAN REPORT');
      lines.push('='.repeat(60));
      lines.push('');
      lines.push(`Status: ${report.safe ? '✅ SAFE TO SHARE' : '⚠️ ISSUES FOUND'}`);
      lines.push(`Messages scanned: ${report.stats.totalMessages}`);
      lines.push(`Characters scanned: ${report.stats.scannedChars.toLocaleString()}`);
      lines.push(`Issues found: ${report.stats.issuesFound}`);
      lines.push('');
  
      if (report.warnings.length > 0) {
        lines.push('WARNINGS:');
        report.warnings.forEach(w => lines.push(`  ${w}`));
        lines.push('');
      }
  
      if (report.detected.length > 0) {
        lines.push('DETECTED ISSUES:');
        lines.push('');
  
        // Group by severity
        const bySeverity = {
          critical: report.detected.filter(d => d.severity === 'critical'),
          high: report.detected.filter(d => d.severity === 'high'),
          medium: report.detected.filter(d => d.severity === 'medium'),
          low: report.detected.filter(d => d.severity === 'low')
        };
  
        Object.entries(bySeverity).forEach(([severity, issues]) => {
          if (issues.length > 0) {
            lines.push(`${severity.toUpperCase()} (${issues.length}):`);
            issues.forEach((issue, i) => {
              lines.push(`  ${i + 1}. ${issue.type} in ${issue.location}`);
              lines.push(`     Preview: ${issue.preview}`);
              lines.push(`     ${issue.suggestion}`);
              if (issue.autoRedact) {
                lines.push(`     ✅ Will be auto-redacted`);
              }
              lines.push('');
            });
          }
        });
      }
  
      lines.push('='.repeat(60));
      return lines.join('\n');
    }
  }
  
  // Usage example
  export async function scanBeforeSharing(
    chatId: string,
    messages: Array<{ speaker: string; content: string }>
  ): Promise<{ safe: boolean; report: SanitizationReport; redactedMessages?: any[] }> {
    const sanitizer = new ChatSanitizer();
    
    // Scan for issues
    const report = await sanitizer.scanChat(messages);
  
    // Auto-redact critical issues
    let redactedMessages;
    if (report.stats.criticalIssues > 0) {
      redactedMessages = await sanitizer.redactChat(messages, { autoRedactCritical: true });
    }
  
    return {
      safe: report.safe,
      report,
      redactedMessages
    };
  }