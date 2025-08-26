// config.js - Configuration for Microsoft Graph API OAuth

const CONFIG = {
  AUTH_URL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  ACCESS_TOKEN_URL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  CLIENT_ID: "your_client_id_here", // Replace with actual client ID
  CLIENT_SECRET: "your_client_secret_here", // Replace with actual client secret
  SCOPE: "https://graph.microsoft.com/.default",
  REDIRECT_URI: (() => {
    // Handle Chrome extension environment safely
    if (typeof globalThis !== "undefined" && globalThis.chrome && globalThis.chrome.identity) {
      return globalThis.chrome.identity.getRedirectURL()
    }
    return "https://your-extension-id.chromiumapp.org/"
  })(),
  GRAPH_API_BASE: "https://graph.microsoft.com/v1.0",
  EXCEL_FILE_PATH: "/ChromeExt - DB/DB.xlsx",
  TABLE_NAME: "LogTable",
}

if (typeof window !== "undefined") {
  window.CONFIG = CONFIG
}

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG
}
