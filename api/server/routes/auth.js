const express = require('express');
const { createSetBalanceConfig, isEnabled, isEmailDomainAllowed } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const {
  resetPasswordRequestController,
  resetPasswordController,
  registrationController,
  graphTokenController,
  refreshController,
} = require('~/server/controllers/AuthController');
const { setAuthTokens } = require('~/server/services/AuthService');
const { createSocialUser, handleExistingUser } = require('~/strategies/process');
const { findUser } = require('~/models');
const {
  regenerateBackupCodes,
  disable2FA,
  confirm2FA,
  enable2FA,
  verify2FA,
} = require('~/server/controllers/TwoFactorController');
const { verify2FAWithTempToken } = require('~/server/controllers/auth/TwoFactorAuthController');
const { logoutController } = require('~/server/controllers/auth/LogoutController');
const { loginController } = require('~/server/controllers/auth/LoginController');
const { getAppConfig } = require('~/server/services/Config');
const middleware = require('~/server/middleware');
const { Balance } = require('~/db/models');

const setBalanceConfig = createSetBalanceConfig({
  getAppConfig,
  Balance,
});

const router = express.Router();

const ldapAuth = !!process.env.LDAP_URL && !!process.env.LDAP_USER_SEARCH_BASE;
//Local
router.post('/logout', middleware.requireJwtAuth, logoutController);
router.post(
  '/login',
  middleware.logHeaders,
  middleware.loginLimiter,
  middleware.checkBan,
  ldapAuth ? middleware.requireLdapAuth : middleware.requireLocalAuth,
  setBalanceConfig,
  loginController,
);
router.post('/refresh', refreshController);
router.post(
  '/register',
  middleware.registerLimiter,
  middleware.checkBan,
  middleware.checkInviteUser,
  middleware.validateRegistration,
  registrationController,
);
router.post(
  '/requestPasswordReset',
  middleware.resetPasswordLimiter,
  middleware.checkBan,
  middleware.validatePasswordReset,
  resetPasswordRequestController,
);
router.post(
  '/resetPassword',
  middleware.checkBan,
  middleware.validatePasswordReset,
  resetPasswordController,
);

router.get('/2fa/enable', middleware.requireJwtAuth, enable2FA);
router.post('/2fa/verify', middleware.requireJwtAuth, verify2FA);
router.post('/2fa/verify-temp', middleware.checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', middleware.requireJwtAuth, confirm2FA);
router.post('/2fa/disable', middleware.requireJwtAuth, disable2FA);
router.post('/2fa/backup/regenerate', middleware.requireJwtAuth, regenerateBackupCodes);

router.get('/graph-token', middleware.requireJwtAuth, graphTokenController);

/**
 * Mobile Google OAuth - accepts Google user info from native app
 * and returns JWT token for authentication
 */
router.post('/google/mobile', middleware.loginLimiter, async (req, res) => {
  try {
    const { accessToken, email, name, picture, googleId } = req.body;

    if (!accessToken || !email || !googleId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the access token with Google
    const verifyResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
    );

    if (!verifyResponse.ok) {
      logger.error('[googleMobileAuth] Invalid Google access token');
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const tokenInfo = await verifyResponse.json();

    // Verify the token belongs to the claimed email
    if (tokenInfo.email !== email) {
      logger.error('[googleMobileAuth] Email mismatch');
      return res.status(401).json({ message: 'Token email mismatch' });
    }

    const appConfig = await getAppConfig();

    // Check domain allowlist
    if (!isEmailDomainAllowed(email, appConfig?.registration?.allowedDomains)) {
      logger.error(`[googleMobileAuth] Email domain not allowed: ${email}`);
      return res.status(403).json({ message: 'Email domain not allowed' });
    }

    // Find or create user
    let user = await findUser({ googleId });

    if (!user) {
      user = await findUser({ email: email?.trim() });

      if (user && user.provider !== 'google') {
        logger.info(`[googleMobileAuth] User ${email} exists with provider ${user.provider}`);
        return res.status(400).json({
          message: `This email is already registered with ${user.provider}. Please use that method to sign in.`,
        });
      }
    }

    if (user?.provider === 'google') {
      // Update existing user
      await handleExistingUser(user, picture, appConfig, email);
    } else if (!user) {
      // Check if social registration is allowed
      const ALLOW_SOCIAL_REGISTRATION = isEnabled(process.env.ALLOW_SOCIAL_REGISTRATION);
      if (!ALLOW_SOCIAL_REGISTRATION) {
        logger.error(`[googleMobileAuth] Social registration disabled for: ${email}`);
        return res.status(403).json({ message: 'Social registration is disabled' });
      }

      // Create new user
      user = await createSocialUser({
        email,
        avatarUrl: picture,
        provider: 'google',
        providerKey: 'googleId',
        providerId: googleId,
        username: name?.split(' ')[0] || email.split('@')[0],
        name: name || email.split('@')[0],
        emailVerified: true,
        appConfig,
      });
    }

    // Generate JWT token
    const token = await setAuthTokens(user._id, res);

    // Return token and user info
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error('[googleMobileAuth] Error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

module.exports = router;
