/**
 * SECURITY: Impersonation Security Guard
 * 
 * This module ensures that impersonation functionality is COMPLETELY disabled
 * in production environments with multiple layers of protection.
 */

export class ImpersonationSecurityGuard {
  private static readonly DEVELOPMENT_ENV = 'development';
  
  /**
   * SECURITY CHECK: Verify if impersonation is allowed in current environment
   * @returns true only if NODE_ENV === 'development'
   */
  static isImpersonationAllowed(): boolean {
    const isDevelopment = process.env.NODE_ENV === this.DEVELOPMENT_ENV;
    
    if (!isDevelopment) {
      console.warn('[SECURITY] Impersonation attempt blocked in production environment');
    }
    
    return isDevelopment;
  }
  
  /**
   * SECURITY CHECK: Extract impersonation ID only if environment allows it
   * @param req Express request object
   * @returns impersonation ID if allowed, null otherwise
   */
  static getImpersonationId(req: any): string | null {
    if (!this.isImpersonationAllowed()) {
      return null;
    }
    
    return req.query.impersonate as string || req.headers['x-impersonate'] as string || null;
  }
  
  /**
   * SECURITY AUDIT: Log impersonation usage for security monitoring
   * @param userId The user ID being impersonated
   * @param realUserId The real authenticated user ID
   */
  static auditImpersonation(userId: string, realUserId?: string): void {
    if (this.isImpersonationAllowed()) {
      console.log('[SECURITY AUDIT] Impersonation active:', {
        impersonatedUser: userId,
        realUser: realUserId || 'unknown',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    }
  }
}