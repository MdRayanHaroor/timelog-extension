// graph-auth.js - Microsoft Graph API OAuth utilities

/* global chrome */

const CONFIG = (typeof window !== "undefined" && window.CONFIG) || {
  CLIENT_ID: "your_client_id",
  CLIENT_SECRET: "your_client_secret",
  REDIRECT_URI: "your_redirect_uri",
  AUTH_URL: "your_auth_url",
  ACCESS_TOKEN_URL: "your_access_token_url",
  SCOPE: "your_scope",
}

class GraphAuth {
  constructor() {
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }

  async authenticate() {
    try {
      const authUrl = this.buildAuthUrl()

      // Use Chrome Identity API for OAuth flow
      const redirectUrl = await new Promise((resolve, reject) => {
        window.chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true,
          },
          (redirectUrl) => {
            if (window.chrome.runtime.lastError) {
              reject(new Error(window.chrome.runtime.lastError.message))
            } else {
              resolve(redirectUrl)
            }
          },
        )
      })

      const authCode = this.extractAuthCode(redirectUrl)
      const tokens = await this.exchangeCodeForTokens(authCode)

      await this.storeTokens(tokens)
      return tokens.access_token
    } catch (error) {
      console.error("Authentication failed:", error)
      throw error
    }
  }

  buildAuthUrl() {
    const params = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      response_type: "code",
      redirect_uri: CONFIG.REDIRECT_URI,
      scope: CONFIG.SCOPE,
      response_mode: "query",
    })
    return `${CONFIG.AUTH_URL}?${params.toString()}`
  }

  extractAuthCode(redirectUrl) {
    const url = new URL(redirectUrl)
    const code = url.searchParams.get("code")
    if (!code) {
      throw new Error("Authorization code not found in redirect URL")
    }
    return code
  }

  async exchangeCodeForTokens(authCode) {
    const response = await fetch(CONFIG.ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        code: authCode,
        grant_type: "authorization_code",
        redirect_uri: CONFIG.REDIRECT_URI,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`)
    }

    return response.json()
  }

  async storeTokens(tokens) {
    const expiryTime = Date.now() + tokens.expires_in * 1000
    await window.chrome.storage.local.set({
      graphTokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiryTime,
      },
    })

    this.accessToken = tokens.access_token
    this.refreshToken = tokens.refresh_token
    this.tokenExpiry = expiryTime
  }

  async getValidToken() {
    const stored = await window.chrome.storage.local.get(["graphTokens"])
    if (stored.graphTokens) {
      const { access_token, refresh_token, expires_at } = stored.graphTokens

      if (Date.now() < expires_at - 60000) {
        // 1 minute buffer
        this.accessToken = access_token
        return access_token
      }

      // Try to refresh token
      if (refresh_token) {
        try {
          const newTokens = await this.refreshAccessToken(refresh_token)
          await this.storeTokens(newTokens)
          return newTokens.access_token
        } catch (error) {
          console.error("Token refresh failed:", error)
        }
      }
    }

    // Need to re-authenticate
    return this.authenticate()
  }

  async refreshAccessToken(refreshToken) {
    const response = await fetch(CONFIG.ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    return response.json()
  }

  async clearTokens() {
    await window.chrome.storage.local.remove(["graphTokens"])
    this.accessToken = null
    this.refreshToken = null
    this.tokenExpiry = null
  }
}

// Create singleton instance and make it globally available
const graphAuth = new GraphAuth()
if (typeof window !== "undefined") {
  window.graphAuth = graphAuth
}
